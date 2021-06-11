let _sortedBy = null;
let _sortDirection = 'asc';

const sortRecordsByField = (self, sortedBy) => {
    _sortedBy = sortedBy;
    _sortDirection = _sortDirection === 'asc' ? 'desc' : 'asc';

    self.records = [...self._orginalRecords].sort(sortBy(_sortedBy, _sortDirection === 'asc' ? 1 : -1));
};

const setSortedByColumnStyle = (self, sortedBy) => {
    clearOldSortedByColumnStyle(self);

    const sortedByColumn = self.template.querySelector(`div[data-field="${sortedBy}"]`);

    if (sortedByColumn) {
        sortedByColumn.dataset.sortedByColumn = true;
        sortedByColumn.classList.add('sorted-column');
    }
};

const clearOldSortedByColumnStyle = (self) => {
    const oldSortedByColumn = self.template.querySelector('div[data-sorted-by-column="true"]');

    if (oldSortedByColumn) {
        oldSortedByColumn.dataset.sortedByColumn = false;
        oldSortedByColumn.classList.remove('sorted-column');
    }
};

const sortBy = (field, reverse) => {
    const key = x => { return x[field] || "" };

    return (a, b) => {
        a = key(a);
        b = key(b);
        return reverse * ((a > b) - (b > a));
    };
};

export {
    sortRecordsByField, 
    setSortedByColumnStyle
};