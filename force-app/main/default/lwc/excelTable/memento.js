let changesHistory = [];

const creteSnapshot = (state) => {
    changesHistory.push(state);
};

const getPreviousState = () => {
    return changesHistory.pop();
};

const hasHistory = () => {
    return changesHistory.length > 0;
};

export {
    creteSnapshot,
    getPreviousState,
    hasHistory
};
