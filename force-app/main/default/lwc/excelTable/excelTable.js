import { LightningElement, api } from 'lwc';
import { creteSnapshot, getPreviousState, hasHistory } from './excelTableServices/memento';
import { createUUID } from './excelTableServices/utils';
import { itterateThroughCellsInRangeAndApplyLogic, getCoordinatesBetweenPoints } from './excelTableServices/cellService';
import { sortRecordsByField, setSortedByColumnStyle, setSortedBy }  from './excelTableServices/sortService';

const MODES = {
    AREA_SELECTION: 'AREA_SELECTION',
    MASS_CELLS_UPDATE: 'MASS_CELLS_UPDATE'
};

const SELECTED_CELL_DATASET = 'selectedcell';
const SELECTED_AREA_CELL_DATASET = 'selected';
export default class ExcelTable extends LightningElement {

    @api showRowNumberColumn = false;	
    
    _records = [];
    _orginalRecords = [];
    _columns = [];

    @api set columns(columns) {
        this._columns = columns;
    }

    get columns() {
        return this._columns;
    }

    @api set records(records) {
        this._orginalRecords = JSON.parse(JSON.stringify(records));

        this._records = records.map(record => { 
            return {
                recordId: record.Id,
                fields: this.columns.map(column => {
                    return {
                        key: createUUID(),
                        fieldName: column.fieldName,
                        value: record[column.fieldName] || ""
                    }
                })
            }
        })
    }

    get records() {
        return this._records;
    }

    contextMenuItems = [
        { label: 'Copy',  action: 'copy',  icon: 'utility:copy',  actionHandler: this.handleCopy.bind(this)  }, 
        { label: 'Paste', action: 'paste', icon: 'utility:paste', actionHandler: this.handlePaste.bind(this) },
        { label: 'Undo',  action: 'undo',  icon: 'utility:undo',  actionHandler: this.handleUndo.bind(this)  }
    ];

    isAreaSelectionInProgress = false;
    isCellCopied = false;
    isStartTyping = false;
    isRendered = false;
    selectedCellCoordinates = {}; //this with blue border
    selectedAreaCoordinates = {}; //this with blue background
    copyCoordinates = {};

    @api getEditedData() {
        return this.records;
    }

    // getters

    get hasRecords() {
        return this.records && this.records.length > 0;
    }

    // lifecycle hooks

    renderedCallback() {
        if (this.isRendered) {
            return;
        }
        this.hideContextMenu();
        this.hidePasteContextMenuItem();
        this.hideUndoContextMenuItem();
       // window.addEventListener('keypress', this.handleKeypress.bind(this));
        this.isRendered = true;
    }

    // handlers 

    handleCellActionKeyDown(e) {
        this.isCellCopied = true;

    }

    handleColumnSortClick(event) {
        const sortedBy = event.target.dataset.field

        setSortedBy(sortedBy);
        sortRecordsByField(this); //TODO pass only proxy 
        setSortedByColumnStyle(this);  //TODO pass only proxy 
    }

    handleKeypress(e) {
        console.log('handleKeypress')
        this.isStartTyping = true;
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

    handleDoubleClick(e) {
        e.target.focus();
    }

    previousCellValue;
    handleFocusIn(e) {
        this.previousCellValue = e.currentTarget.innerText
    }

    handleFocusOut(e) {
        if (this.isStartTyping) {
            const oldData = [];

            let { cellXPosition, cellYPosition }  = this.getCellCoordinates(e.currentTarget?.parentElement);
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

    handleCellValueChange(e) {
 
        let recordId = e.currentTarget?.parentElement?.parentElement?.dataset?.recordId;
        let fieldName = e.currentTarget?.parentElement?.dataset?.field;
        let value = e.currentTarget.innerText;

        this.updateRecordsValue(recordId, fieldName, value);
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
                this.getCellByQuerySelectorWithDatasetAttributes(cell.x, cell.y).childNodes[0].textContent = cell.value;
            });
        }
        if (!hasHistory()) {
            this.hideUndoContextMenuItem();
        }
        this.hideContextMenu();
    }

    @api
    handleCellChange(e) {
        console.log('handleCellChange', e)
        this.hideContextMenu();

        this.clearPreviouslySelectedArea();
        this.clearPreviouslySelectedCell();

        let selectedCellCoordinatesX = this.selectedCellCoordinates.x;
        let selectedCellCoordinatesY = this.selectedCellCoordinates.y;

        switch (e.which) {
            case 40: //down
                selectedCellCoordinatesX += 1;
                break;
            case 38: //up
                selectedCellCoordinatesX -= 1;
                break;
            case 39: //right
                selectedCellCoordinatesY += 1;
                break;
            case 37: //left
                selectedCellCoordinatesY -= 1;
                break;
        }

        this.selectedCellCoordinates.x = 0 <= selectedCellCoordinatesX && selectedCellCoordinatesX < this.records.length ? selectedCellCoordinatesX : this.selectedCellCoordinates.x;
        this.selectedCellCoordinates.y = 0 <= selectedCellCoordinatesY && selectedCellCoordinatesY < this.columns.length ? selectedCellCoordinatesY : this.selectedCellCoordinates.y;

        //this.markSelectedCellHtml(e.currentTarget);
        let cell = this.template.querySelector(`td[data-row="${this.selectedCellCoordinates.x}"][data-column="${this.selectedCellCoordinates.y}"]`);
        cell.dataset[SELECTED_CELL_DATASET] = true;
        cell.childNodes[0].focus();

       // this.startAreaSelection();
        //this.setSelectedAreaStartCoordinates(e.currentTarget);
        this.selectedAreaCoordinates.fromX = this.selectedCellCoordinates.x;
        this.selectedAreaCoordinates.fromY = this.selectedCellCoordinates.y;
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
        let { cellXPosition, cellYPosition } = this.getCellCoordinates(startCell);
        
        this.selectedAreaCoordinates.fromX = cellXPosition;
        this.selectedAreaCoordinates.fromY = cellYPosition;
    }

    setSelectedAreaEndCoordinates(endCell) {
        let { cellXPosition, cellYPosition } = this.getCellCoordinates(endCell);

        this.selectedAreaCoordinates.toX = cellXPosition;
        this.selectedAreaCoordinates.toY = cellYPosition;
    }

    cleareSelectedAreaEndCoordinates() {
        this.selectedAreaCoordinates.toX = null;
        this.selectedAreaCoordinates.toY = null;
    }

    clearPreviouslySelectedArea() {
        this.cleareSelectedAreaEndCoordinates();
        this.removeDatasetFromCellsBetweenRange(SELECTED_AREA_CELL_DATASET);
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
        let transformedCopyCoordinates = this.getCopiedAreaNormalizedCoordinates();
        let values = this.getValuesBetweemRange(transformedCopyCoordinates);

        let selectedRowsSize = transformedCopyCoordinates.toX - transformedCopyCoordinates.fromX;
        let selectedColumnsSize = transformedCopyCoordinates.toY - transformedCopyCoordinates.fromY;

        let oldData = [];
        let logicToApply = (x, y, row, column) => {
            let cell = this.getCellByQuerySelectorWithDatasetAttributes(x, y);
            if (cell) {
                let innerDiv = cell.childNodes[0];
                oldData.push({
                    x: x,
                    y: y,
                    value: innerDiv.textContent
                });

                let innerDivContentElement = innerDiv?.childNodes[0] || innerDiv;
                innerDivContentElement.textContent = values[row][column];

                let recordId = innerDiv?.parentElement?.parentElement?.dataset?.recordId;
                let fieldName = innerDiv?.parentElement?.dataset?.field;
                let value = values[row][column];

                this.updateRecordsValue(recordId, fieldName, value);
            }
        };

        creteSnapshot(oldData);
        this.showUndoContextMenuItem();

        itterateThroughCellsInRangeAndApplyLogic(
            {
                fromX: this.selectedCellCoordinates.x,
                toX: this.selectedCellCoordinates.x + selectedRowsSize,
                fromY: this.selectedCellCoordinates.y, 
                toY: this.selectedCellCoordinates.y + selectedColumnsSize
            }, 
            logicToApply.bind(this)
        );

        this.markAreaCellsBetweenCoordinates({
            fromX: this.selectedCellCoordinates.x,
            toX: this.selectedCellCoordinates.x + selectedRowsSize,
            fromY: this.selectedCellCoordinates.y,
            toY: this.selectedCellCoordinates.y + selectedColumnsSize
        });

        this.selectedAreaCoordinates.fromX = this.selectedCellCoordinates.x;
        this.selectedAreaCoordinates.toX = this.selectedCellCoordinates.x + selectedRowsSize;
        this.selectedAreaCoordinates.fromY = this.selectedCellCoordinates.y;
        this.selectedAreaCoordinates.toY = this.selectedCellCoordinates.y + selectedColumnsSize;
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

                let recordId = innerDiv?.parentElement?.parentElement?.dataset?.recordId;
                let fieldName = innerDiv?.parentElement?.dataset?.field;
                let value = copiedCellValue;

                this.updateRecordsValue(recordId, fieldName, value);
            }
        };

        creteSnapshot(oldData);
        this.showUndoContextMenuItem();

        itterateThroughCellsInRangeAndApplyLogic(
            this.getSelectedAreaNormalizedCoordinates(), 
            logicToApply.bind(this)
        );
    }

    getValuesBetweemRange({fromX, toX, fromY, toY}) {
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

    getCellByQuerySelectorWithDatasetAttributes(x, y) {
        return this.template.querySelector(`td[data-row="${x}"][data-column="${y}"]`);
    }
    
    getCellCoordinates(cell) {
        return {
            cellXPosition: Number(cell.dataset.row),
            cellYPosition: Number(cell.dataset.column)
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
        this._records.find(record => record.recordId === recordId)
                     .fields
                     .find(field => field.fieldName === fieldName)
                     .value = value;
        this._orginalRecords.find(record => record.Id === recordId)[fieldName] = value;
    }

    showSpinner() {
        this.dispatchEvent(
            new CustomEvent('loading', {
                detail: true    
            })
        );
    }

    hideSpinner() {
        this.dispatchEvent(
            new CustomEvent('loading', {
                detail: false    
            })
        );
    }

    fireUnsavedChangesEvent() {
        this.dispatchEvent(
            new CustomEvent('unsavedchange')
        );
    }
}
