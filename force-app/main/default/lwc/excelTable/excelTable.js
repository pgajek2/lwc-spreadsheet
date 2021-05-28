import { LightningElement } from 'lwc';


const columns = [
    { label: 'Label', fieldName: 'name', editable: true},
    { label: 'Website', fieldName: 'website', type: 'url' },
    { label: 'Phone', fieldName: 'phone', type: 'phone' },
    { label: 'Balance', fieldName: 'amount', type: 'currency' },
    { label: 'CloseAt', fieldName: 'closeAt', type: 'date' },
];

export default class ExcelTable extends LightningElement {

    columns = columns;
    startSelection = false;
    globalStartX;
    globalEndX;
    globalStartY;
    globalEndY;

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

    handleDown(e) {
        this.clearSelectedRange();

        this.startSelection = true;

        this.globalStartX = e.currentTarget.dataset.row;
        this.globalStartY = e.currentTarget.dataset.column;
    }

    handleOver(e) {
        if (this.startSelection) {
            this.markSelectedRange(e.currentTarget.dataset.row,  e.currentTarget.dataset.column )
        }
    }

    handleUp(e) {
        this.startSelection = false;
    }

    clearSelectedRange() {
        this.template.querySelectorAll('[data-selected="true"]').forEach(cell => {
            cell.classList.remove('selected-cell');
            cell.dataset.selected = false;
        });
    }

    markSelectedRange(currentRow, currentColumn) {

        this.clearSelectedRange();

        let startX = this.globalStartX;
        let endX = currentRow;

        let startY = this.globalStartY;
        let endY = currentColumn;

        let coordinates = this.calculateCoordinates(startX, endX, startY, endY);

        this.markCells(
            { start: coordinates.startX, end: coordinates.endX }, 
            { start: coordinates.startY, end: coordinates.endY }
        );
    }


    calculateCoordinates(startX, endX, startY, endY) {

        let coordinates = {
            startX: null,
            endX: null,
            startY: null,
            endY: null
        };

        if (endX - startX <= 0 && endY - startY <= 0) {
            coordinates.startX = endX;
            coordinates.endX = startX;
            coordinates.startY = endY;
            coordinates.endY = startY;
        } else  if (endX - startX <= 0 && endY - startY >= 0) {
            coordinates.startX = endX;
            coordinates.endX = startX;
            coordinates.startY = startY;
            coordinates.endY = endY;
        } else  if (endX - startX >= 0 && endY - startY <= 0) {
            coordinates.startX = startX;
            coordinates.endX = endX;
            coordinates.startY = endY;
            coordinates.endY = startY;
        } else  if (endX - startX >= 0 && endY - startY >= 0) {
            coordinates.startX = startX;
            coordinates.endX = endX;
            coordinates.startY = startY;
            coordinates.endY = endY;
        }

        return coordinates;
    }


    markCells(x, y) {
        let xList = this.generateX(x.start, x.end);
        let yList = this.generateY(y.start, y.end);

        if (xList.length > 0 && yList.length > 0) {
            xList.forEach(x => {
                yList.forEach(y => {
                    let cell = this.template.querySelector(`[data-row="${x}"][data-column="${y}"]`);
                    if (cell) {
                        cell.classList.add('selected-cell');
                        cell.dataset.selected = true;
                    }

                });
            });
        }
    }

    generateX(Xp, Xk) {
        if (!Xp || !Xk) {
            return [];
        }

        let xList = [];

        for (let i = Xp; i <= Xk; i++) {
            xList.push(i);
        }
        return xList;
    }

    generateY(Yp, Yk) {
        if (!Yp || !Yk) {
            return [];
        }

        let yList = [];

        for (let i = Yp; i <= Yk; i++) {
            yList.push(i);
        }
        return yList;
    }
}