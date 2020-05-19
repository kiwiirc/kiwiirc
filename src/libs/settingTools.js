'kiwi public';

// What settings keys to ignore when building period delimited settings object
let ignoreKeys = ['emojis', 'themes', 'bnc', 'aliases', 'restricted', 'kiwiServer',
    'hide_advanced', 'windowTitle', 'startupOptions', 'plugins', 'presetNetworks', 'ircFramework'];

// Converts settings object to period delimited key based object
// eg { buffers.alert_on: false }
export function buildTree(data, base, object, modified) {
    Object.keys(object).forEach((key) => {
        let value = object[key];
        let ourBase = base.concat([key]);
        if (['string', 'boolean', 'number'].indexOf(typeof value) !== -1) {
            if (ignoreKeys.indexOf(key) !== -1 ||
             (ourBase[0] && ignoreKeys.indexOf(ourBase[0])) !== -1) {
                return;
            }

            if (!data[ourBase.join('.')] || data[ourBase.join('.')].val !== value) {
                data[ourBase.join('.')] = {
                    key: ourBase.join('.'),
                    val: value,
                    type: typeof value,
                    modified: modified,
                };
            }
        } else if (typeof value === 'object' && value !== null) {
            buildTree(data, ourBase, value, modified);
        }
    });
}
