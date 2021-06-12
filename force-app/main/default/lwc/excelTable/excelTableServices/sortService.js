let _sortedBy = null;
let _sortDirection = 'asc';

const setSortedBy = (sortedBy) => {
    _sortedBy = sortedBy;
    _sortDirection = _sortDirection === 'asc' ? 'desc' : 'asc';
};

const sortRecordsByField = (self) => {
    self.records = [...self._orginalRecords].sort(sortBy(_sortedBy, _sortDirection === 'asc' ? 1 : -1));
};

const setSortedByColumnStyle = (self) => {
    clearOldSortedByColumnStyle(self);

    const sortedByColumn = self.template.querySelector(`div[data-field="${_sortedBy}"]`);

    if (sortedByColumn) {
        sortedByColumn.dataset.sortedByColumn = true;
    }

    setSortDirectionIcon(self);
};

const clearOldSortedByColumnStyle = (self) => {
    const oldSortedByColumn = self.template.querySelector('div[data-sorted-by-column="true"]');

    if (oldSortedByColumn) {
        oldSortedByColumn.dataset.sortedByColumn = false;
    }
};

const setSortDirectionIcon = (self) => {
    const sortDirectionIcon = self.template.querySelector(`lightning-icon[data-arrow-field="${_sortedBy}`);

    if (sortDirectionIcon) {
       sortDirectionIcon.iconName = _sortDirection === 'asc' ? 'utility:arrowdown' : 'utility:arrowup';
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
    setSortedBy,
    sortRecordsByField, 
    setSortedByColumnStyle
};