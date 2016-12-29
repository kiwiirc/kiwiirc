import $ from 'jquery';

export default class ConfigLoader {
    constructor() {
        this.config = Object.create(null);
    }

    loadFromUrl(configUrl) {
        return new Promise((resolve, reject) => {
            $.getJSON(configUrl)
            .done(data => {
                this.config = data;
                resolve(this.config);
            })
            .fail(() => {
                reject();
            });
        });
    }
}
