import { LightningElement, api } from 'lwc';
import { creteSnapshot, getPreviousState, hasHistory } from './memento';

const CELL_SELECTED_FROM_RANGE = 'selected-cell';
const CELL_SELECTED = 'selected-cell-border';
const CELL_COPIED = 'selected-copied-cell';

export default class ExcelTable extends LightningElement {

    @api showRowNumberColumn = false;	
    
    _records = [];
    _columns = [];

    @api set columns(columns) {
        this._columns = columns;
    }

    get columns() {
        return this._columns;
    }

    @api set records(records) {
        this._records = records.map(record => { 
            return {
                recordId: record.Id,
                fields: this.columns.map(column => {
                    return {
                        key: this.createUUID(),
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
    isStartTyping = false;
    isRendered = false;
    selectedCellCoordinates = {}; //this with blue border
    selectedAreaCoordinates = {}; //this with blue background
    copyCoordinates = {};

    @api getEditedData() {
        return this.records;
    }

    /* GETTERS */

    get hasRecords() {
        return this.records && this.records.length > 0;
    }

    renderedCallback() {
        if (this.isRendered) {
            return;
        }
        this.hideContextMenu();
        this.hidePasteContextMenuItem();
        this.hideUndoContextMenuItem();
        document.addEventListener('keypress', this.handleKeypress.bind(this));
        this.isRendered = true;
    }

    createUUID() {
        var dt = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (dt + Math.random()*16)%16 | 0;
            dt = Math.floor(dt/16);
            return (c=='x' ? r :(r&0x3|0x8)).toString(16);
        });
        return uuid;
    }
    // handlers 

    handleResize(e) {
        console.log('handleResize', e)
    }

    handleKeypress(e) {
        if (!this.isStartTyping) {
            this.getCellByQuerySelectorWithDatasetAttributes(
                this.selectedCellCoordinates.x, 
                this.selectedCellCoordinates.y
            ).firstChild.disabled = false;
            // this.getCellByQuerySelectorWithDatasetAttributes(
            //     this.selectedCellCoordinates.x, 
            //     this.selectedCellCoordinates.y
            // ).firstChild.select();
            this.getCellByQuerySelectorWithDatasetAttributes(
                this.selectedCellCoordinates.x, 
                this.selectedCellCoordinates.y
            ).firstChild.focus();
            this.isStartTyping = true;
        }
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
       // e.target.disabled = false;
        e.target.focus();
    }

    handleFocusOut(e) {
       // e.target.disabled = true;
       console.log('out')
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
                break;
        }
    }

    handleUndo(e) {
        let previosState = getPreviousState();
        if (previosState && previosState.length > 0) {
            previosState.forEach(cell => {
                this.getCellByQuerySelectorWithDatasetAttributes(cell.x, cell.y).firstChild.innerText = cell.value;
            });
        }
        if (!hasHistory()) {
            this.hideUndoContextMenuItem();
        }
        this.hideContextMenu();
    }


    // Selected Cell

    setSelectedCellCoordinates(currentCell) {
        let { cellXPosition, cellYPosition } = this.getCellCoordinates(currentCell);

        this.selectedCellCoordinates.x = cellXPosition;
        this.selectedCellCoordinates.y = cellYPosition;
    }

    clearPreviouslySelectedCell() {
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_SELECTED, 'selectedcell');
    }

    markSelectedCellHtml(cell) {
        cell.classList.add(CELL_SELECTED);
        cell.dataset.selectedcell = true;
    }

    isCurremtCellInSelectedArea(currentCell) {
        let { fromX, toX, fromY, toY } = this.getSelectedAreaNormalizedCoordinates();
        let { cellXPosition, cellYPosition } = this.getCellCoordinates(currentCell);

        return this.getCoordinatesBetweenPoints(fromX, toX).includes(cellXPosition) 
            && this.getCoordinatesBetweenPoints(fromY, toY).includes(cellYPosition)
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
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_SELECTED_FROM_RANGE, 'selected');
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
        this.addCssClassAndDatasetToCellsBetweenRange(coordinates, CELL_SELECTED_FROM_RANGE, 'selected');
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
        this.addCssClassAndDatasetToCellsBetweenRange(
            this.getCopiedAreaNormalizedCoordinates(), 
            CELL_COPIED, 
            'copied'
        );
    }

    setItemToCopy() {
        this.copyCoordinates = JSON.parse(JSON.stringify(this.selectedAreaCoordinates));
    }

    clearPreviouslyCopiedCellsHtml() {
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_COPIED, 'copied');
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

        this.itterateThroughCellsInRangeAndApplyLogic(
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
                oldData.push({
                    x: x,
                    y: y,
                    value: cell.firstChild.innerText
                });
                cell.firstChild.innerText = values[row][column];

                let recordId = cell.firstChild?.parentElement?.parentElement?.dataset?.recordId;
                let fieldName = cell.firstChild?.parentElement?.dataset?.field;
                let value = cell.firstChild?.innerText;

                this.updateRecordsValue(recordId, fieldName, value);
            }
        };

        creteSnapshot(oldData);
        this.showUndoContextMenuItem();

        this.itterateThroughCellsInRangeAndApplyLogic(
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

    getValuesBetweemRange({fromX, toX, fromY, toY}) {
        let values = [];

        let logicToApply = (x, y, xIndex, yIndex) => {
            if (!values[xIndex]) {
                values[xIndex] = [];
            }
            values[xIndex].push(
                this.getCellByQuerySelectorWithDatasetAttributes(x, y).lastChild.innerText
            );
        };

        this.itterateThroughCellsInRangeAndApplyLogic(
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

    addCssClassAndDatasetToCellsBetweenRange({ fromX, toX, fromY, toY }, cssClassToAdd, datasetPropertyToSet) {
        let logicToApply = (x, y, xIndex, yIndex) => {
            let cell = this.getCellByQuerySelectorWithDatasetAttributes(x, y);
            if (cell) {
                cell.classList.add(cssClassToAdd);
                cell.dataset[datasetPropertyToSet] = true;
            }
        };

        this.itterateThroughCellsInRangeAndApplyLogic(
            { fromX, toX, fromY, toY }, 
            logicToApply.bind(this)
        );
    }

    itterateThroughCellsInRangeAndApplyLogic({ fromX, toX, fromY, toY }, logicToApply) {
        let xList = this.getCoordinatesBetweenPoints(fromX, toX);
        let yList = this.getCoordinatesBetweenPoints(fromY, toY);

        if (xList.length > 0 && yList.length > 0) {
            xList.forEach((x, xIndex) => {
                yList.forEach((y, yIndex) => {
                    logicToApply(x, y, xIndex, yIndex);
                });
            });
        }
    }

    removeCssClassAndDatasetFromCellsBetweenRange(cssClassToRemove, datasetPropertyToClear) {
        let itemsToClrear = this.template.querySelectorAll(`[data-${datasetPropertyToClear}="true"]`);

        if (itemsToClrear && itemsToClrear.length > 0) {
            itemsToClrear.forEach(cell => {
                cell.classList.remove(cssClassToRemove);
                cell.dataset[datasetPropertyToClear] = false;
            });
        }
    }

    getCellByQuerySelectorWithDatasetAttributes(x, y) {
        return this.template.querySelector(`[data-row="${x}"][data-column="${y}"]`);
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

    getCoordinatesBetweenPoints(a, b) {
        let numbersInRange = [];

        while (a <= b) {
            numbersInRange.push(a);
            a++;
        }
        return numbersInRange;
    }

    updateRecordsValue(recordId, fieldName, value) {
        this._records.find(record => record.recordId === recordId)
                     .fields
                     .find(field => field.fieldName === fieldName)
                     .value = value;
    }

    fireUnsavedChangesEvent() {
        this.dispatchEvent(
            new CustomEvent('unsavedchange')
        );
    }
}
