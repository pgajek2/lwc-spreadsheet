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

    isRangeSelectionBegan = false;
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
        console.log('handleDoubleClick')
        e.target.disabled = false;
    }

    handleFocusOut(e) {
        console.log('handleFocusOut')
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

                this.allowRangeSelection();
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
        if (this.isRangeSelectionBegan) {
            this.clearPreviouslySelectedArea();
            this.markSelectedAreaInHtml(e.currentTarget);
        }
    }

    handleUp(e) {
        switch (e.which) {
            case 1: //left click
                this.abandonRangeSelection();
                this.setSelectedAreaEndCoordinates(e.currentTarget);
                break;
        }
    }

    // Selected Cell

    setSelectedCellCoordinates(currentCell) {
        if (!currentCell) {
            this.selectedCellCoordinates.x = null;
            this.selectedCellCoordinates.y = null;

            return;
        }
        this.selectedCellCoordinates.x = Number(currentCell.dataset.row);
        this.selectedCellCoordinates.y = Number(currentCell.dataset.column);
    }

    clearPreviouslySelectedCell() {
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_SELECTED, 'selectedcell');
    }

    markSelectedCellHtml(cell) {
        cell.classList.add(CELL_SELECTED);
        cell.dataset.selectedcell = true;
    }

    isCurremtCellInSelectedArea(cell) {

        let {fromX, toX, fromY, toY} = this.transformCoordinates(
            this.selectedAreaCoordinates.fromX, 
            this.selectedAreaCoordinates.toX,
            this.selectedAreaCoordinates.fromY, 
            this.selectedAreaCoordinates.toY
        );

        let xList = this.getNumbersBetween(fromX, toX);
        let yList = this.getNumbersBetween(fromY, toY);

        let currentCellX = Number(cell.dataset.row);
        let currentCellY = Number(cell.dataset.column);

        return xList.includes(currentCellX) && yList.includes(currentCellY)
    }

    // Selected Area

    setSelectedAreaStartCoordinates(startCell) {
        if (!startCell) {
            this.selectedAreaCoordinates.fromX = null;
            this.selectedAreaCoordinates.fromY = null;

            return;
        }
        this.selectedAreaCoordinates.fromX = Number(startCell.dataset.row);
        this.selectedAreaCoordinates.fromY = Number(startCell.dataset.column);
    }

    setSelectedAreaEndCoordinates(endCell) {
        if (!endCell) {
            this.selectedAreaCoordinates.toX = null;
            this.selectedAreaCoordinates.toY = null;

            return;
        }
        this.selectedAreaCoordinates.toX = Number(endCell.dataset.row);
        this.selectedAreaCoordinates.toY = Number(endCell.dataset.column);
    }

    clearPreviouslySelectedArea() {
        this.setSelectedAreaEndCoordinates(null);
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_SELECTED_FROM_RANGE, 'selected');
    }

    markSelectedAreaInHtml(currentCell) {
        this.markCellsAsSelectedWithCssClassAndDatasetProperty(
            this.transformCoordinates(
                this.selectedAreaCoordinates.fromX, 
                Number(currentCell.dataset.row), 
                this.selectedAreaCoordinates.fromY, 
                Number(currentCell.dataset.column)
            )
        )
    }

    markCellsAsSelectedWithCssClassAndDatasetProperty(coordinates) {
        this.addCssClassAndDatasetToCellsBetweenRange(coordinates, CELL_SELECTED_FROM_RANGE, 'selected');
    }

    allowRangeSelection() {
        this.isRangeSelectionBegan = true;
    }

    abandonRangeSelection() {
        this.isRangeSelectionBegan = false;
    }

    // Context Menu

    showContextMenu() {
        this.template.querySelector('.menu-context').classList.remove('slds-hide');
    }

    hideContextMenu() {
        this.template.querySelector('.menu-context').classList.add('slds-hide');
    }

    showPasteContextMenuItem() {
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
        this.clearCopiedCellsHtml();
        this.makeCellsAsCopiedWithCssClassAndDatasetProperty(
            this.transformCoordinates(
                this.selectedAreaCoordinates.fromX, 
                this.selectedAreaCoordinates.toX, 
                this.selectedAreaCoordinates.fromY, 
                this.selectedAreaCoordinates.toY
            )
        );
        this.setItemToCopy();
        this.showPasteContextMenuItem();
    }

    makeCellsAsCopiedWithCssClassAndDatasetProperty(coordinates) {
        this.addCssClassAndDatasetToCellsBetweenRange(coordinates, CELL_COPIED, 'copied');
    }

    setItemToCopy() {
        this.copyCoordinates = JSON.parse(JSON.stringify(this.selectedAreaCoordinates));
    }

    clearCopiedCellsHtml() {
        this.removeCssClassAndDatasetFromCellsBetweenRange(CELL_COPIED, 'copied');
    }

    // Paste

    applyPasteAction() {
        console.log('destination: ' + JSON.stringify(this.selectedCellCoordinates))
        console.log('copyCoordinates:', JSON.stringify(this.copyCoordinates));

        let transformedCopyCoordinates = this.transformCoordinates(
            this.copyCoordinates.fromX, 
            this.copyCoordinates.toX, 
            this.copyCoordinates.fromY, 
            this.copyCoordinates.toY
        );
        let values = this.getValuesBetweemRamge(
            transformedCopyCoordinates
        );
        console.log(values);
        let xSize = transformedCopyCoordinates.toX - transformedCopyCoordinates.fromX;
        let ySize = transformedCopyCoordinates.toY - transformedCopyCoordinates.fromY;

        let xList = this.getNumbersBetween(this.selectedCellCoordinates.x, this.selectedCellCoordinates.x + xSize);
        let yList = this.getNumbersBetween(this.selectedCellCoordinates.y, this.selectedCellCoordinates.y + ySize);
        console.log(xList);
        console.log(yList);

        if (xList.length > 0 && yList.length > 0) {
            xList.forEach((x, row) => {
                yList.forEach((y, column)  => {
                    let cell = this.template.querySelector(`[data-row="${x}"][data-column="${y}"]`);
                    if (cell) {
                        cell.firstChild.value = values[row][column];
                    }
                });
            });
        }

        this.markCellsAsSelectedWithCssClassAndDatasetProperty({
            fromX: this.selectedCellCoordinates.x,
            toX: this.selectedCellCoordinates.x + xSize,
            fromY: this.selectedCellCoordinates.y,
            toY: this.selectedCellCoordinates.y + ySize
        });

        this.hideContextMenu();
        this.clearCopiedCellsHtml();
       // this.clearItemsToCopy(); allow to past multiple times
    }

    clearItemsToCopy() {
        this.copyCoordinates = {};
        this.hidePasteContextMenuItem();
    }

    // General

    getValuesBetweemRamge({fromX, toX, fromY, toY}) {
        let xList = this.getNumbersBetween(fromX, toX);
        let yList = this.getNumbersBetween(fromY, toY);
        
        let values = [], rowValues = []
        if (xList.length > 0 && yList.length > 0) {
            xList.forEach(x => {
                rowValues = []
                yList.forEach(y => {
                    let cell = this.template.querySelector(`[data-row="${x}"][data-column="${y}"]`);
                    if (cell) {
                        rowValues.push(cell.firstChild.value);
                    }
                });
                values.push(rowValues);
            });
            
        }

        return values;
    }

    transformCoordinates(startX, endX, startY, endY) {
        return {
            fromX: endX - startX > 0 ? startX : endX,
            toX: endX - startX > 0 ? endX : startX,
            fromY: endY - startY > 0 ? startY : endY,
            toY: endY - startY > 0 ? endY : startY
        };
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
        let itemsToClrear = this.template.querySelectorAll(`[data-${datasetPropertyToClear}="true"]`);

        if (itemsToClrear && itemsToClrear.length > 0) {
            itemsToClrear.forEach(cell => {
                cell.classList.remove(cssClassToRemove);
                cell.dataset[datasetPropertyToClear] = false;
            });
        }
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
