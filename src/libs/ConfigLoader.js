import $ from 'jquery';
import _ from 'lodash';

export default class ConfigLoader {
    constructor() {
        this.config = Object.create(null);
    }

    loadFromUrl(configUrl) {
        return new Promise((resolve, reject) => {
            $.getJSON(configUrl)
            .done(data => {
                this.config = Object.create(null);
                _.each(data, (val, key) => {
                    this.config[key] = this.insertReplacements(val);
                });

                resolve(this.config);
            })
            .fail(() => {
                reject();
            });
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
