// Define a non-enumerable property on an object with an optional setter callback
export function def(target, key, value, canSet) {
    let val = value;

    let definition = {
        get() {
            return val;
        },
    };

    if (canSet) {
        definition.set = function set(newVal) {
            let oldVal = val;
            val = newVal;
            if (typeof canSet === 'function') {
                canSet(newVal, oldVal);
            }
        };
    }

    Object.defineProperty(target, key, definition);

    if (typeof canSet === 'function') {
        canSet(val);
    }
}
