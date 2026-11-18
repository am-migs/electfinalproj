
const STORAGE_PREFIX = "pcbManager_";

export function saveData(key, data) {
    try {
        localStorage.setItem(
            `${STORAGE_PREFIX}${key}`,
            JSON.stringify(data)
        );

        return true;
    } catch (error) {
        console.error(`Unable to save ${key}:`, error);
        return false;
    }
}

export function loadData(key, defaultValue = null) {
    try {
        const storedData = localStorage.getItem(
            `${STORAGE_PREFIX}${key}`
        );

        return storedData !== null
            ? JSON.parse(storedData)
            : defaultValue;
    } catch (error) {
        console.error(`Unable to load ${key}:`, error);
        return defaultValue;
    }
}

export function deleteData(key) {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
}

export function clearApplicationData() {
    Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
}

export function exportStoredData() {
    const exportedData = {};

    Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .forEach(key => {
            const originalKey = key.replace(STORAGE_PREFIX, "");

            exportedData[originalKey] = loadData(
                originalKey,
                null
            );
        });

    return exportedData;
}
