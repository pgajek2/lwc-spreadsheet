import { LightningElement } from 'lwc';

const columns = [
    { label: 'Label', fieldName: 'name', editable: true},
    { label: 'Website', fieldName: 'website', type: 'url' },
    { label: 'Phone', fieldName: 'phone', type: 'phone' },
    { label: 'Balance', fieldName: 'amount', type: 'currency' },
    { label: 'CloseAt', fieldName: 'closeAt', type: 'date' },
];

const data = [
    {Id: '12', test: '0001'},
    {Id: '123', test: '0002'},
    {Id: '14', test: '0003'},
    {Id: '125', test: '0004'},
    {Id: '16', test: '0005'},
    {Id: '127', test: '0006'},
    {Id: '18', test: '0007'},
    {Id: '1212', test: '0008'},
    {Id: '19', test: '0009'},
    {Id: '12df', test: '0010'},
    {Id: '1df', test: '0011'},
    {Id: '12s', test: '0012'},
    {Id: '1eea', test: '0013'},
    {Id: '12dc', test: '0014'},
    {Id: '14t', test: '0015'},
    {Id: '12jk', test: '0016'},
    {Id: '1h', test: '0017'},
    {Id: '12ghj', test: '0018'},
    {Id: 'nn1', test: '0019'},
    {Id: '12hj', test: '0020'},
    {Id: '1hj', test: '0021'},
    {Id: '12gh', test: '0022'},
    {Id: '1nb', test: '0023'},
    {Id: '12hj', test: '0024'}
]

const CONTEXT_MENU_ACTIONS = {
    COPY: 'copy',
    PASTE: 'paste'
};

const CELL_SELECTED_FROM_RANGE = 'selected-cell';
const CELL_SELECTED = 'selected-cell-border';
const CELL_COPIED = 'selected-copied-cell';

export default class ExcelTable extends LightningElement {

    columns = columns;
    data = data;

    isAreaSelectionInProgress = false;
    isRendered = false;
    selectedCellCoordinates = {}; //this with blue border
    selectedAreaCoordinates = {}; //this with blue background
    copyCoordinates = {};

    renderedCallback() {
        if (this.isRendered) {
            return;
        }
        this.hideContextMenu();
        this.hidePasteContextMenuItem();
        this.isRendered = true;
    }

    // handlers 

    handleContextMenu(e) {
        e.preventDefault();

        this.showContextMenu(); 
        this.setContextMenuPosition(e.pageX, e.pageY);
    }

    handleContextMenuAction(e) {
        switch (e.currentTarget.dataset.action) {
            case CONTEXT_MENU_ACTIONS.COPY:
                this.applyCopyAction();
                break;
            case CONTEXT_MENU_ACTIONS.PASTE:
                this.applyPasteAction();
                break;
        }
    }

    handleDoubleClick(e) {
        e.target.disabled = false;
        e.target.focus();
    }

    handleFocusOut(e) {
        e.target.disabled = true;
    }

    handleCellValueChange(e) {
        console.log('handleCellValueChange');
    }

    handleDown(e) {
        switch (e.which) {
            case 1: //left click
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

    setContextMenuPosition(positionX, positionY) {
        let contextMenuElement = this.template.querySelector('.menu-context');

        contextMenuElement.style.setProperty("top", `${positionY}px`);
        contextMenuElement.style.setProperty("left", `${positionX}px`);  
    }

    // Copy 

    applyCopyAction() {
        this.hideContextMenu();
        this.clearPreviouslyCopiedCellsHtml();

        this.setItemToCopy();

        this.markCellsAsCopiedWithCssClassAndDatasetProperty();
        this.addDashedBorderToCopiedArea();
        
        this.showPasteOptionInContextMenu();
    }

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

    applyPasteAction() {
        let transformedCopyCoordinates = this.getCopiedAreaNormalizedCoordinates();
        let values = this.getValuesBetweemRange(transformedCopyCoordinates );

        let selectedRowsSize = transformedCopyCoordinates.toX - transformedCopyCoordinates.fromX;
        let selectedColumnsSize = transformedCopyCoordinates.toY - transformedCopyCoordinates.fromY;

        let logicToApply = (x, y, row, column) => {
            this.getCellByQuerySelectorWithDatasetAttributes(x, y).firstChild.value = values[row][column];
        };

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

        this.hideContextMenu();
        this.clearPreviouslyCopiedCellsHtml();
        this.hideCopyAreaBorder();
    }

    // General

    getValuesBetweemRange({fromX, toX, fromY, toY}) {
        let values = [];

        let logicToApply = (x, y, xIndex, yIndex) => {
            if (!values[xIndex]) {
                values[xIndex] = [];
            }
            values[xIndex].push(
                this.getCellByQuerySelectorWithDatasetAttributes(x, y).firstChild.value
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
            
            cell.classList.add(cssClassToAdd);
            cell.dataset[datasetPropertyToSet] = true;
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
}
