const createUUID = () => {
    let currentDateTime = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (match) => {
        let random = (currentDateTime + Math.random() * 16) % 16 | 0;
        currentDateTime = Math.floor(currentDateTime / 16);
        return (match == 'x' ? random : (random & 0x3 | 0x8)).toString(16);
    });
    return uuid;
};

export {
    createUUID
};

