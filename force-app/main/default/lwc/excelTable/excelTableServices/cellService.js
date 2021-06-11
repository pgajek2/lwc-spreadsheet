const itterateThroughCellsInRangeAndApplyLogic = ({ fromX, toX, fromY, toY }, logicToApply) => {
    let xList = getCoordinatesBetweenPoints(fromX, toX);
    let yList = getCoordinatesBetweenPoints(fromY, toY);

    if (xList.length > 0 && yList.length > 0) {
        xList.forEach((x, xIndex) => {
            yList.forEach((y, yIndex) => {
                logicToApply(x, y, xIndex, yIndex);
            });
        });
    }
};

const getCoordinatesBetweenPoints = (startPoint, endPoint) => {
    let numbersInRange = [];

    while (startPoint <= endPoint) {
        numbersInRange.push(startPoint);
        startPoint++;
    }
    return numbersInRange;
};

export {
    itterateThroughCellsInRangeAndApplyLogic,
    getCoordinatesBetweenPoints
};