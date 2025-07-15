'kiwi public';

import xhr from 'xhr';
import _ from 'lodash';
import JSON5 from 'json5';
import Logger from './Logger';

let log = Logger.namespace('ConfigLoader');

export default class ConfigLoader {
    constructor() {
        this.config = Object.create(null);
        this.valReplacements = Object.create(null);
    }

    addValueReplacement(key, value) {
        this.valReplacements[key] = value;
        return this;
    }

    loadFromUrl(configUrl) {
        return new Promise((resolve, reject) => {
            xhr({ url: configUrl }, (err, response) => {
                if (err) {
                    reject();
                    return;
                }

                let configObj = null;
                try {
                    configObj = JSON5.parse(response.body);
                } catch (parseErr) {
                    log.error('Config ' + parseErr.message);
                    let errMsg = 'Config file error: ' + parseErr.message.replace('JSON5: ', '');
                    // Convert "at 22:16" to "at line 22, position 16"
                    /* eslint-disable arrow-body-style */
                    errMsg = errMsg.replace(/at (\d+):(\d+)/g, (m, m1, m2) => {
                        return `line ${m1}, position ${m2}`;
                    });
                    reject(errMsg);
                    return;
                }

                this.setConfig(configObj);
                resolve(this.config);
            });
        });
    }

    loadFromObj(configObj) {
        return new Promise((resolve, reject) => {
            this.setConfig(configObj);
            resolve(this.config);
        });
    }

    setConfig(confObj) {
        let walkObject = (obj, target) => {
            _.each(obj, (_val, key) => {
                let val = _val;
                if (typeof val === 'string') {
                    val = this.insertReplacements(val);
                    target[key] = val;
                } else if (typeof val === 'object') {
                    target[key] = _.isArray(val) ?
                        [] :
                        {};
                    walkObject(val, target[key]);
                } else {
                    target[key] = val;
                }
            });
        };

        this.config = Object.create(null);
        walkObject(confObj, this.config);
    }

    insertReplacements(input) {
        let out = input;
        let keys = Object.keys(this.valReplacements);
        for (let i = 0; i < keys.length; i++) {
            let k = keys[i];
            if (input === '{{' + k + '}}') {
                // If we have an exact match, return the exact replacement value we have as
                // it may not be a string
                return this.valReplacements[k];
            }

            out = out.replace('{{' + k + '}}', this.valReplacements[k]);
        }
        return out;
    }
}
