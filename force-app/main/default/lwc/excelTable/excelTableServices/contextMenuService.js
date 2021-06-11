let excelTable = null;

const registerExcelTable = (excelTableComponent) => {
    excelTable = excelTableComponent;

    Object.freeze(excelTable);
};

export {
    registerExcelTable
};