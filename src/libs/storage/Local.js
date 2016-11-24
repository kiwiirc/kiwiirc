export function get(name) {
    return new Promise((resolve) => {
        resolve(window.localStorage.getItem(name));
    });
}

export function set(name, val) {
    return new Promise((resolve) => {
        resolve(window.localStorage.setItem(name, val));
    });
}
