import { LightningElement, api } from 'lwc';
import { creteSnapshot, getPreviousState, hasHistory } from './excelTableServices/memento';
import { createUUID } from './excelTableServices/utils';
import { itterateThroughCellsInRangeAndApplyLogic, getCoordinatesBetweenPoints } from './excelTableServices/cellService';
import { sortRecordsByField, setSortedByColumnStyle, setSortedBy }  from './excelTableServices/sortService';


const SELECTED_CELL_DATASET = 'selectedcell';
const SELECTED_AREA_CELL_DATASET = 'selected';
export default class ExcelTable extends LightningElement {

    @api showRowNumberColumn = false;
    @api isLoading = false;	
    
    _columns = [];
    _records = [];
    _updatedRecords = [];

    isAreaSelectionInProgress = false;
    isCellCopied = false;
    isStartTyping = false;
    selectedCellCoordinates = { x: null, y: null }; //cell with blue dashed border
    selectedAreaCoordinates = { fromX: null, toX: null, fromY: null, toY: null }; //this with blue background
    copyCoordinates = { fromX: null, toX: null, fromY: null, toY: null };

    contextMenuItems = [
        { label: 'Copy',  action: 'copy',  icon: 'utility:copy',  class: '',          actionHandler: this.handleCopy.bind(this)  }, 
        { label: 'Paste', action: 'paste', icon: 'utility:paste', class: 'slds-hide', actionHandler: this.handlePaste.bind(this) },
        { label: 'Undo',  action: 'undo',  icon: 'utility:undo',  class: 'slds-hide', actionHandler: this.handleUndo.bind(this)  }
    ];

    @api set columns(columns) {
        this._columns = columns;
    }

    get columns() {
        return this._columns;
    }

    @api set records(records) {
        this._records = this.generateUIRecordsStructure(records);
    }

    get records() {
        return this._records;
    }

    @api getEditedData() {
        return this._updatedRecords;
    }

    @api
    handleNavigationBetweenCells(e) {
        switch (e.which) {
            case 40: //arrow down
                this.setSelectedCell(this.selectedCellCoordinates.x + 1, this.selectedCellCoordinates.y);
                break;
            case 38: //arrow up
                this.setSelectedCell(this.selectedCellCoordinates.x - 1, this.selectedCellCoordinates.y);
                break;
            case 39: //arrow right
                this.setSelectedCell(this.selectedCellCoordinates.x, this.selectedCellCoordinates.y + 1);
                break;
            case 37: //arrow left
                this.setSelectedCell(this.selectedCellCoordinates.x, this.selectedCellCoordinates.y - 1);
                break;
        }
    }

    get hasNoRecords() {
        return (!this.records || !this.records.length) && !this.isLoading;
    }

    // handlers 

    handleCellActionKeyDown(e) {
        this.isCellCopied = true;

    }

    handleColumnSortClick(event) {
        const sortedBy = event.currentTarget.dataset.field

        setSortedBy(sortedBy);
        sortRecordsByField(this); //TODO pass only proxy 
        setSortedByColumnStyle(this);  //TODO pass only proxy 
    }

    handleCopy(e) { 
        e.preventDefault();

        this.hideContextMenu();
        this.clearPreviouslyCopiedCellsHtml();
        this.setItemToCopy();
        this.markCellsAsCopiedWithCssClassAndDatasetProperty();
        this.addDashedBorderToCopiedArea();
        this.showPasteOptionInContextMenu();
    }

    handlePaste(e) {
        e.preventDefault(); 

        this.hideContextMenu();
        this.pasteValuesToSelectedArea();
        this.clearPreviouslyCopiedCellsHtml();
        this.hideCopyAreaBorder();
    }

    handleContextMenu(e) {
        e.preventDefault();

        this.showContextMenu(); 
        this.setContextMenuPosition(e.clientX, e.clientY);
    }

    previousCellValue;
    handleFocusIn(e) {
        this.previousCellValue = e.currentTarget.innerText
    }

    handleCellValueChange(e) {
        this.isStartTyping = true;

        this.updateRecordsValue(
            e.currentTarget?.parentElement?.parentElement?.dataset?.recordId, 
            e.currentTarget?.parentElement?.dataset?.field, 
            e.currentTarget?.innerText
        );
    }

    handleFocusOut(e) {
        if (this.isStartTyping) {
            const oldData = [];
            const { cellXPosition, cellYPosition } = this.getCellCoordinates(e.currentTarget?.parentElement);

            oldData.push({
                x: cellXPosition,
                y: cellYPosition,
                value: this.previousCellValue
            });
    
            creteSnapshot(oldData);

            this.showUndoContextMenuItem();
        }

        this.isStartTyping = false;
    }

    handleDown(e) {
        switch (e.which) {
            case 1: //left click
                this.hideContextMenu();

                this.clearPreviouslySelectedArea();
                this.clearPreviouslySelectedCell();

                this.setSelectedCellCoordinates(e.currentTarget);
                this.markSelectedCellHtml(e.currentTarget);

                this.startAreaSelection();
                this.setSelectedAreaStartCoordinates(e.currentTarget);
                break;
            case 3: //right click
                if (!this.isCurremtCellInSelectedArea(e.currentTarget)) {

                    this.clearPreviouslySelectedArea();
                    this.clearPreviouslySelectedCell();

                    this.setSelectedCellCoordinates(e.currentTarget);
                    this.markSelectedCellHtml(e.currentTarget);

                    this.setSelectedAreaStartCoordinates(e.currentTarget);
                    this.setSelectedAreaEndCoordinates(e.currentTarget);
                }
                break;
        }
    }

    handleOver(e) {
        if (this.isAreaSelectionInProgress) {
            this.clearPreviouslySelectedArea();
            this.recalculateAndMarkSelectedArea(e.currentTarget);
        }
    }

    handleUp(e) {
        switch (e.which) {
            case 1: //left click
                this.finishAreaSelection();
                this.setSelectedAreaEndCoordinates(e.currentTarget);
                this.checkIfCanBeBulkUpdate();

                if (this.isCellCopied) {
                    this.hideContextMenu();
                    this.applyBulkCellUpdate();
                    this.isCellCopied = false;
                }
                
                break;
        }
    }

    handleUndo(e) {
        let previosState = getPreviousState();
        if (previosState && previosState.length > 0) {
            previosState.forEach(cell => {
                let cellTd = this.getCellByQuerySelectorWithDatasetAttributes(cell.x, cell.y);

                if (cellTd) {
                    let innerDiv = cellTd.childNodes[0];
                
                    innerDiv.textContent = cell.value;
    
                    let recordId = innerDiv?.parentElement?.parentElement?.dataset?.recordId;
                    let fieldName = innerDiv?.parentElement?.dataset?.field;
    
                    this.updateRecordsValue(recordId, fieldName, cell.value);
                }
            });
        }
        if (!hasHistory()) {
            this.hideUndoContextMenuItem();
        }
        this.hideContextMenu();
    }

    generateUIRecordsStructure(records) {
        return records.map(record => { 
            return {
                recordId: record.Id,
                fields: this.columns.map(column => {
                    return {
                        key: createUUID(),
                        fieldName: column.fieldName,
                        value: this.getFieldValue(column.fieldName, record) || "",
                        editable: column?.columnAttributes?.isInlineEditable, 
                        lookupObject: column?.columnAttributes?.referenceToObjectApi,
                        lookupFieldApi: column?.columnAttributes?.referenceToFieldApi
                    }
                })
            }
        })
    }

    getFieldValue(fieldApi, data) {
        if (data) {
            let value = data;
            fieldApi.split('.').forEach(field => {
                value = value[field] || '';
            });
            return value;
        }
        return '';
    }

    checkIfCanBeBulkUpdate() {

        let canBeBulkUpdateApply = true; 
        let lookupField = null;
        let lookupObject = null;
        let recordsToBulkUpdate = [];

        const logicToApply = (x, y, row, column) => {
            let cell = this.getCellByQuerySelectorWithDatasetAttributes(x, y);
            if (cell) {
                let innerDiv = cell.firstChild;
                
                recordsToBulkUpdate.push(
                    innerDiv?.parentElement?.parentElement?.dataset?.recordId
                );

                lookupField = innerDiv?.parentElement?.dataset?.lookupField;
                lookupObject = innerDiv?.parentElement?.dataset?.lookupObject;

                if (!lookupObject) {
                    canBeBulkUpdateApply = false;
                    return;
                }
            }
        };

        itterateThroughCellsInRangeAndApplyLogic(
            this.getSelectedAreaNormalizedCoordinates(), 
            logicToApply.bind(this)
        );

        if (canBeBulkUpdateApply) {
            this.dispatchEvent(
                new CustomEvent('allowbulk', {
                    detail: {
                        recordsToBulkUpdate,
                        lookupField,
                        lookupObject
                    }
                })
            );
        } else {
            this.dispatchEvent(
                new CustomEvent('blockbulk')
            );
        }
    }
    
    setSelectedCell(selectedCellCoordinatesX, selectedCellCoordinatesY) {
        this.hideContextMenu();

        this.clearPreviouslySelectedArea();
        this.clearPreviouslySelectedCell();

        this.selectedCellCoordinates.x = 0 <= selectedCellCoordinatesX && selectedCellCoordinatesX < this.records.length ? selectedCellCoordinatesX : this.selectedCellCoordinates.x;
        this.selectedCellCoordinates.y = 0 <= selectedCellCoordinatesY && selectedCellCoordinatesY < this.columns.length ? selectedCellCoordinatesY : this.selectedCellCoordinates.y;

        let cell = this.template.querySelector(`td[data-row="${this.selectedCellCoordinates.x}"][data-column="${this.selectedCellCoordinates.y}"]`);
        cell.dataset[SELECTED_CELL_DATASET] = true;
        cell.childNodes[0].focus();

        this.setSelectedAreaCoordinates({
            fromX: this.selectedCellCoordinates.x,
            fromY: this.selectedCellCoordinates.y
        });
    }

    // Selected Cell

    setSelectedCellCoordinates(currentCell) {
        let { cellXPosition, cellYPosition } = this.getCellCoordinates(currentCell);

        this.selectedCellCoordinates.x = cellXPosition;
        this.selectedCellCoordinates.y = cellYPosition;
    }

    clearPreviouslySelectedCell() {
        this.removeDatasetFromCellsBetweenRange(SELECTED_CELL_DATASET);
    }

    markSelectedCellHtml(cell) {
        cell.dataset[SELECTED_CELL_DATASET] = true;
    }

    isCurremtCellInSelectedArea(currentCell) {
        let { fromX, toX, fromY, toY } = this.getSelectedAreaNormalizedCoordinates();
        let { cellXPosition, cellYPosition } = this.getCellCoordinates(currentCell);

        return getCoordinatesBetweenPoints(fromX, toX).includes(cellXPosition) 
            && getCoordinatesBetweenPoints(fromY, toY).includes(cellYPosition)
    }

    // Selected Area

    setSelectedAreaStartCoordinates(startCell) {
        const { cellXPosition: fromX, cellYPosition: fromY } = this.getCellCoordinates(startCell);

        this.setSelectedAreaCoordinates({ fromX, fromY });
    }

    setSelectedAreaEndCoordinates(endCell) {
        const { cellXPosition: toX, cellYPosition: toY } = this.getCellCoordinates(endCell);

        this.setSelectedAreaCoordinates({ toX, toY });
    }

    clearPreviouslySelectedArea() {
        this.removeDatasetFromCellsBetweenRange(SELECTED_AREA_CELL_DATASET);

        this.setSelectedAreaCoordinates({ toX: null, toY: null });
    }

    recalculateAndMarkSelectedArea(currentCell) {
        let { cellXPosition, cellYPosition } = this.getCellCoordinates(currentCell);

        this.markAreaCellsBetweenCoordinates(
            this.getNormalizedCoordinateSystem(
                this.selectedAreaCoordinates.fromX, 
                cellXPosition, 
                this.selectedAreaCoordinates.fromY, 
                cellYPosition
            )
        )
    }

    markAreaCellsBetweenCoordinates(coordinates) {
        this.addDatasetToCellsBetweenRange(coordinates, SELECTED_AREA_CELL_DATASET);
    }

    startAreaSelection() {
        this.isAreaSelectionInProgress = true;
    }

    finishAreaSelection() {
        this.isAreaSelectionInProgress = false;
    }

    // Context Menu

    showContextMenu() {
        this.template.querySelector('.menu-context').classList.remove('slds-hide');
    }

    hideContextMenu() {
        this.template.querySelector('.menu-context').classList.add('slds-hide');
    }

    showCopyAreaBorder() {
        this.template.querySelector('.copy-border').classList.remove('slds-hide');
    }

    hideCopyAreaBorder() {
        this.template.querySelector('.copy-border').classList.add('slds-hide');
    }

    showPasteOptionInContextMenu() {
        this.template.querySelector('lightning-button[data-action="paste"]').classList.remove('slds-hide');
    }

    hidePasteContextMenuItem() {
        this.template.querySelector('lightning-button[data-action="paste"]').classList.add('slds-hide');
    }

    showUndoContextMenuItem() {
        this.template.querySelector('lightning-button[data-action="undo"]').classList.remove('slds-hide');
    }

    hideUndoContextMenuItem() {
        this.template.querySelector('lightning-button[data-action="undo"]').classList.add('slds-hide');
    }

    setContextMenuPosition(positionX, positionY) {
        let contextMenuElement = this.template.querySelector('.menu-context');

        contextMenuElement.style.setProperty("top", `${positionY}px`);
        contextMenuElement.style.setProperty("left", `${positionX}px`);  
    }

    // Copy 

    markCellsAsCopiedWithCssClassAndDatasetProperty() {
        this.addDatasetToCellsBetweenRange(
            this.getCopiedAreaNormalizedCoordinates(), 
            'copied'
        );
    }

    setItemToCopy() {
        this.copyCoordinates = JSON.parse(JSON.stringify(this.selectedAreaCoordinates));
    }

    clearPreviouslyCopiedCellsHtml() {
        this.removeDatasetFromCellsBetweenRange('copied');
    }

    addDashedBorderToCopiedArea() {
        let { width, height, beginOffsetTop, beginOffsetLeft } = this.getCopyAreaDimentions();
        let copyAreaBorder = this.template.querySelector('.copy-border');

        copyAreaBorder.style.setProperty("top", `${beginOffsetTop}px`);
        copyAreaBorder.style.setProperty("left", `${beginOffsetLeft}px`);
        copyAreaBorder.style.setProperty("width", `${width}px`);
        copyAreaBorder.style.setProperty("height", `${height}px`);

        this.showCopyAreaBorder();
    }

    getCopyAreaDimentions() {
        let copyCoordinates = this.getCopiedAreaNormalizedCoordinates();

        let width = 0;
        let height = 0;
        let beginOffsetTop = 0;
        let beginOffsetLeft = 0;

        let calculateCopiedAreaSize = (x, y, xIndex, yIndex) => {
            if (xIndex === 0 && yIndex === 0) { //first cell position
                beginOffsetTop = this.getCellByQuerySelectorWithDatasetAttributes(x, y).offsetTop;
                beginOffsetLeft = this.getCellByQuerySelectorWithDatasetAttributes(x, y).offsetLeft;
            }
            if (xIndex === 0) { //only size for first row
                width += this.getCellByQuerySelectorWithDatasetAttributes(x, y).offsetWidth;
            }
            if (yIndex === 0) { //only size for first colum
                height += this.getCellByQuerySelectorWithDatasetAttributes(x, y).offsetHeight;
            }
        };

        itterateThroughCellsInRangeAndApplyLogic(
            copyCoordinates, 
            calculateCopiedAreaSize.bind(this)
        );

        return { 
            width, 
            height,
            beginOffsetTop,
            beginOffsetLeft
        };
    }

    // Paste

    pasteValuesToSelectedArea() {
        const COPY_COORDINATES = this.getCopiedAreaNormalizedCoordinates();
        const COPY_AREA_VALUES = this.getvaluesBetweenRange(COPY_COORDINATES);

        const PREVIOUS_AREA_VALUES = [];

        const logicToApply = (x, y, row, column) => {
            let cell = this.getCellByQuerySelectorWithDatasetAttributes(x, y);

            if (cell) {
                let innerDiv = cell.childNodes[0];

                if (innerDiv.isContentEditable) {

                    PREVIOUS_AREA_VALUES.push({
                        x, y,value: innerDiv.textContent
                    });

                    (innerDiv?.childNodes[0] || innerDiv).textContent = COPY_AREA_VALUES[row][column];
    
                    const { recordId, fieldName } = this.getCellProperties(innerDiv);

                    this.updateRecordsValue(recordId, fieldName, COPY_AREA_VALUES[row][column]);
                }
            }
        };

        creteSnapshot(PREVIOUS_AREA_VALUES);

        this.showUndoContextMenuItem();

        const ROWS_SIZE = COPY_COORDINATES.toX - COPY_COORDINATES.fromX;
        const COLUMNS_SIZE = COPY_COORDINATES.toY - COPY_COORDINATES.fromY;

        const fromX = this.selectedCellCoordinates.x;
        const toX = this.selectedCellCoordinates.x + ROWS_SIZE;
        const fromY = this.selectedCellCoordinates.y;
        const toY = this.selectedCellCoordinates.y + COLUMNS_SIZE;

        itterateThroughCellsInRangeAndApplyLogic(
            { fromX, toX, fromY, toY }, 
            logicToApply.bind(this)
        );

        this.markAreaCellsBetweenCoordinates({ fromX, toX, fromY, toY });
        this.setSelectedAreaCoordinates({ fromX, toX, fromY, toY });
    }

    // General

    applyBulkCellUpdate() {
        
        let copiedCellValue = this.getCellByQuerySelectorWithDatasetAttributes(this.selectedCellCoordinates.x, this.selectedCellCoordinates.y).childNodes[0].textContent;
        let oldData = [];

        const logicToApply = (x, y, row, column) => {
            let cell = this.getCellByQuerySelectorWithDatasetAttributes(x, y);
            if (cell) {
                let innerDiv = cell.firstChild;

                oldData.push({
                    x: x,
                    y: y,
                    value: innerDiv.textContent
                });

                innerDiv.childNodes[0].textContent = copiedCellValue;

                const { recordId, fieldName } = this.getCellProperties(innerDiv);

                this.updateRecordsValue(recordId, fieldName, copiedCellValue);
            }
        };

        creteSnapshot(oldData);
        this.showUndoContextMenuItem();

        itterateThroughCellsInRangeAndApplyLogic(
            this.getSelectedAreaNormalizedCoordinates(), 
            logicToApply.bind(this)
        );
    }

    getvaluesBetweenRange({fromX, toX, fromY, toY}) {
        let values = [];

        let logicToApply = (x, y, xIndex, yIndex) => {
            if (!values[xIndex]) {
                values[xIndex] = [];
            }
            values[xIndex].push(
                this.getCellByQuerySelectorWithDatasetAttributes(x, y).firstChild.textContent
            );
        };

        itterateThroughCellsInRangeAndApplyLogic(
            { fromX, toX, fromY, toY }, 
            logicToApply.bind(this)
        );

        return values;
    }

    getNormalizedCoordinateSystem(fromX, toX, fromY, toY) {
        return {
            fromX: toX - fromX > 0 ? fromX : toX,
            toX: toX - fromX > 0 ? toX : fromX,
            fromY: toY - fromY > 0 ? fromY : toY,
            toY: toY - fromY > 0 ? toY : fromY
        }; // coordinates order in asc order
    }

    addDatasetToCellsBetweenRange({ fromX, toX, fromY, toY }, datasetPropertyToSet) {
        let logicToApply = (x, y, xIndex, yIndex) => {
            let cell = this.getCellByQuerySelectorWithDatasetAttributes(x, y);
            if (cell) {
                cell.dataset[datasetPropertyToSet] = true;
            }
        };

        itterateThroughCellsInRangeAndApplyLogic(
            { fromX, toX, fromY, toY }, 
            logicToApply.bind(this)
        );
    }

    removeDatasetFromCellsBetweenRange(datasetPropertyToClear) {
        let itemsToClrear = this.template.querySelectorAll(`[data-${datasetPropertyToClear}="true"]`);

        if (itemsToClrear && itemsToClrear.length > 0) {
            itemsToClrear.forEach(cell => {
                cell.dataset[datasetPropertyToClear] = false;
            });
        }
    }

    getCellProperties(tdInnerDivCell) {
        return {
            recordId: tdInnerDivCell?.parentElement?.parentElement?.dataset?.recordId,
            fieldName: tdInnerDivCell?.parentElement?.dataset?.field,
            value: tdInnerDivCell?.innerText
        };
    }

    getCellByQuerySelectorWithDatasetAttributes(x, y) {
        return this.template.querySelector(`td[data-row="${x}"][data-column="${y}"]`);
    }
    
    getCellCoordinates(cell) {
        return {
            cellXPosition: Number(cell.dataset.row),
            cellYPosition: Number(cell.dataset.column)
        };
    }

    setSelectedAreaCoordinates(newCoordinates) {
        this.selectedAreaCoordinates = {
            ...this.selectedAreaCoordinates,
            ...newCoordinates
        };
    }

    getSelectedAreaNormalizedCoordinates() {
        return this.getNormalizedCoordinateSystem(
            this.selectedAreaCoordinates.fromX, 
            this.selectedAreaCoordinates.toX, 
            this.selectedAreaCoordinates.fromY, 
            this.selectedAreaCoordinates.toY
        );
    }

    getCopiedAreaNormalizedCoordinates() {
        return this.getNormalizedCoordinateSystem(
            this.copyCoordinates.fromX, 
            this.copyCoordinates.toX, 
            this.copyCoordinates.fromY, 
            this.copyCoordinates.toY
        );
    }

    updateRecordsValue(recordId, fieldName, value) {
        let recordToUpdate = this._updatedRecords.find(record => record.Id === recordId);

        if (recordToUpdate) {
            recordToUpdate[fieldName] = value;
            return;
        } 

        this._updatedRecords.push({
            Id: recordId,
            [fieldName]: value
        });
    }

    fireUnsavedChangesEvent() {
        this.dispatchEvent(
            new CustomEvent('unsavedchange')
        );
    }
}
