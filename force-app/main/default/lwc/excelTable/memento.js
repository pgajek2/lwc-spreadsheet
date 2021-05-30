let changesHistory = [];

const creteAreaValuesSnapshot = () => {

};

const getPreviousState = () => {
    return changesHistory[changesHistory.length - 1];
};

export {
    creteAreaValuesSnapshot,
    getPreviousState
};
