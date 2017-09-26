import xhr from 'xhr';
import _ from 'lodash';
import Logger from './Logger';

let log = Logger.namespace('ConfigLoader');

export default class ConfigLoader {
    constructor() {
        this.config = Object.create(null);
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
                    log.error('Config file: ' + parseErr.stack);
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
        out = out.replace('{{hostname}}', window.location.hostname);
        out = out.replace('{{host}}', window.location.host);
        out = out.replace('{{port}}', window.location.port || 80);
        out = out.replace('{{hash}}', (window.location.hash || '').substr(1));
        out = out.replace('{{query}}', (window.location.search || '').substr(1));
        out = out.replace('{{referrer}}', window.document.referrer);
        return out;
    }
}
