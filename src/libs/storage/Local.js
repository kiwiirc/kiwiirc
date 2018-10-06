let supportedCached = null;

export function get(name) {
    if (!isSupported()) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        resolve(window.localStorage.getItem(name));
    });
}

export function set(name, val) {
    if (!isSupported()) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        resolve(window.localStorage.setItem(name, val));
    });
}

function isSupported() {
    if (supportedCached === null) {
        supportedCached = storageAvailable('localStorage');
    }
    return supportedCached;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#Testing_for_availability
function storageAvailable(type) {
    let storage;
    try {
        let x = '__storage_test__';
        storage = window[type];
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;
    }
}
