'kiwi public';

import xhr from 'xhr';
import _ from 'lodash';
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
                    configObj = JSON.parse(response.body);
                } catch (parseErr) {
                    log.error('Config ' + parseErr.message);
                    reject();
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
        this.config = Object.create(null);
        _.each(confObj, (_val, key) => {
            let val = _val;
            if (typeof val === 'string') {
                val = this.insertReplacements(val);
            }

            this.config[key] = val;
        });
    }

    insertReplacements(input) {
        let out = input;
        Object.keys(this.valReplacements).forEach((k) => {
            out = out.replace('{{' + k + '}}', this.valReplacements[k]);
        });
        return out;
    }
}
