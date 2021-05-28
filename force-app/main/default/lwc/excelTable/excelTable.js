import { LightningElement } from 'lwc';


const columns = [
    { label: 'Label', fieldName: 'name', editable: true},
    { label: 'Website', fieldName: 'website', type: 'url' },
    { label: 'Phone', fieldName: 'phone', type: 'phone' },
    { label: 'Balance', fieldName: 'amount', type: 'currency' },
    { label: 'CloseAt', fieldName: 'closeAt', type: 'date' },
];

const CONTEXT_MENU_ACTIONS = {
    COPY: 'copy',
    PASTE: 'paste'
};

const CELL_SELECTED_FROM_RANGE = 'selected-cell';
const CELL_SELECTED = 'selected-cell-border';
const CELL_COPIED = 'selected-copied-cell';

export default class ExcelTable extends LightningElement {

    columns = columns;
    isRangeSelectionBegan = false;
    isRendered = false;
    hasCopiedItems = false;
    //renderContextMenu = false;
    globalCoordinates = {};
    copyCoordinates = {};

    data = [
        {Id: '12', website: 'aa'},
        {Id: '123', website: 'bb'},
        {Id: '14', website: 'aa'},
        {Id: '125', website: 'bb'},
        {Id: '16', website: 'aa'},
        {Id: '127', website: 'bb'},
        {Id: '18', website: 'aa'},
        {Id: '1212', website: 'bb'},
        {Id: '19', website: 'aa'},
        {Id: '12df', website: 'bb'},
        {Id: '1df', website: 'aa'},
        {Id: '12s', website: 'bb'},
        {Id: '1eea', website: 'aa'},
        {Id: '12dc', website: 'bb'},
        {Id: '14t', website: 'aa'},
        {Id: '12jk', website: 'bb'},
        {Id: '1h', website: 'aa'},
        {Id: '12ghj', website: 'bb'},
        {Id: 'nn1', website: 'aa'},
        {Id: '12hj', website: 'bb'},
        {Id: '1hj', website: 'aa'},
        {Id: '12gh', website: 'bb'},
        {Id: '1nb', website: 'aa'},
        {Id: '12hj', website: 'bb'}
    ]

    renderedCallback() {
        if (this.isRendered) {
            return;
        }
        this.hideContextMenu();
        this.addContextMenuEventListenerToTable();
        this.isRendered = true;
    }

    addContextMenuEventListenerToTable() {
        this.template.querySelector('table').addEventListener('contextmenu', (e) => { 
            e.preventDefault();

            this.showContextMenu(); 
            this.setContextMenuPosition(e.clientX, e.clientY);
        }, false);
    }

    setContextMenuPosition(positionX, positionY) {
        let contextMenuElement = this.template.querySelector('.menu-context');

        contextMenuElement.style.setProperty("bottom", `${positionX}px`);
        contextMenuElement.style.setProperty("right", `${positionY}px`);
    }

    showContextMenu() {
        this.template.querySelector('.menu-context').style.display = "block";
    }

    hideContextMenu() {
        this.template.querySelector('.menu-context').style.display = "none";
    }

    startRangeSelection() {
        this.isRangeSelectionBegan = true;
    }

    stopRangeSelection() {
        this.isRangeSelectionBegan = false;
    }

    setStartSelectionCoordinates(x, y) {
        this.globalCoordinates.fromX = x;
        this.globalCoordinates.fromY = y;
    }

    setEndSelectionCoordinates(x, y) {
        this.globalCoordinates.toX = x;
        this.globalCoordinates.toY = y;
    }
    // handlers 

    handleContextMenuAction(e) {
        switch (e.detail.name) {
            case CONTEXT_MENU_ACTIONS.COPY:
                this.applyCopyAction();
                break;
            case CONTEXT_MENU_ACTIONS.PASTE:
                this.applyPasteAction();
                break;
        }
    }

    handleDoubleClick(e) {
        console.log('Double')
        e.target.disabled = false;
    }

    handleFocusOut(e) {
        e.target.disabled = true;
    }

    handleDown(e) {
        if (e.which === 1) { //left click
            this.clearSelectedRange();
            this.cleareSelectedCell();
            this.markSelectedCell(e.currentTarget);
            this.startRangeSelection();
            this.setStartSelectionCoordinates(
                Number(e.currentTarget.dataset.row),
                Number(e.currentTarget.dataset.column)
            );
        }
    }

    handleOver(e) {
        if (this.isRangeSelectionBegan) {
            this.markSelectedRange(
                Number(e.currentTarget.dataset.row), 
                Number(e.currentTarget.dataset.column)
            );
        }
    }

    handleUp(e) {
        if (e.which === 1) { //left click
            this.stopRangeSelection();
            this.setEndSelectionCoordinates(
                Number(e.currentTarget.dataset.row),
                Number(e.currentTarget.dataset.column)
            );
        }
    }

    applyCopyAction() {
        this.hideContextMenu();
        this.clearCopiedCells();
        this.makeCellsAsCopiedWithCssClassAndDatasetProperty(
            this.transformCoordinates(
                this.globalCoordinates.fromX, 
                this.globalCoordinates.toX, 
                this.globalCoordinates.fromY, 
                this.globalCoordinates.toY
            )
        );
        this.setItemToCopy();
    }

    applyPasteAction() {
        console.log('globalCoordinantes: ' + JSON.stringify(this.globalCoordinates))
        console.log('copyCoordinates:', JSON.stringify(this.copyCoordinates));
        this.hideContextMenu();
        this.clearCopiedCells();
        this.clearItemsToCopy();
    }

    setItemToCopy() {
        this.copyCoordinates = JSON.parse(JSON.stringify(this.globalCoordinates));
        this.hasCopiedItems = true;
    }

    clearItemsToCopy() {
        this.copyCoordinates = {};
        this.hasCopiedItems = false;
    }

    clearCopiedCells() {
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_COPIED, 'copied');
    }

    markSelectedCell(cell) {
        cell.classList.add(CELL_SELECTED);
        cell.dataset.selectedcell = true;
    }

    cleareSelectedCell() {
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_SELECTED, 'selectedcell');
    }

    markSelectedRange(currentX, currentY) {
        this.clearSelectedRange();
        this.markCellsAsSelectedWithCssClassAndDatasetProperty(
            this.transformCoordinates(
                this.globalCoordinates.fromX, 
                currentX,
                this.globalCoordinates.fromY, 
                currentY
            )
        );
    }

    clearSelectedRange() {
        this.setEndSelectionCoordinates(null, null);
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_SELECTED_FROM_RANGE, 'selected');
    }

    transformCoordinates(startX, endX, startY, endY) {
        return {
            fromX: endX - startX > 0 ? startX : endX,
            toX: endX - startX > 0 ? endX : startX,
            fromY: endY - startY > 0 ? startY : endY,
            toY: endY - startY > 0 ? endY : startY
        };
    }

    markCellsAsSelectedWithCssClassAndDatasetProperty(coordinates) {
        this.addCssClassAndDatasetToCellsBetweenRange(coordinates, CELL_SELECTED_FROM_RANGE, 'selected');
    }

    makeCellsAsCopiedWithCssClassAndDatasetProperty(coordinates) {
        this.addCssClassAndDatasetToCellsBetweenRange(coordinates, CELL_COPIED, 'copied');
    }

    addCssClassAndDatasetToCellsBetweenRange({fromX, toX, fromY, toY}, cssClassToAdd, datasetPropertyToSet) {
        let xList = this.getNumbersBetween(fromX, toX);
        let yList = this.getNumbersBetween(fromY, toY);

        if (xList.length > 0 && yList.length > 0) {
            xList.forEach(x => {
                yList.forEach(y => {
                    let cell = this.template.querySelector(`[data-row="${x}"][data-column="${y}"]`);
                    if (cell) {
                        cell.classList.add(cssClassToAdd);
                        cell.dataset[datasetPropertyToSet] = true;
                    }
                });
            });
        }
    }

    removeCssClassAndDatasetFromCellsBetweenRange(cssClassToRemove, datasetPropertyToClear) {
        this.template.querySelectorAll(`[data-${datasetPropertyToClear}="true"]`).forEach(cell => {
            cell.classList.remove(cssClassToRemove);
            cell.dataset[datasetPropertyToClear] = false;
        });
    }

    getNumbersBetween(a, b) {
        let numbersInRange = [];

        while (a <= b) {
            numbersInRange.push(a);
            a++;
        }
        return numbersInRange;
    }

}