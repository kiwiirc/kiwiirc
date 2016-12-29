import _ from 'lodash';
import Vue from 'vue';

import App from './App';
import StartupError from 'src/components/StartupError';
import Logger from 'src/libs/Logger';
import ConfigLoader from 'src/libs/ConfigLoader';
import state from 'src/libs/state';

// A handy debugging var..
window.state = state;

let configLoader = new ConfigLoader();
configLoader.loadFromUrl('static/config.json')
    .then(applyConfig)
	.then(startApp)
	.catch(showError);


function applyConfig(config) {
    _.each(config, (val, key) => {
        state.settings[key] = val;
    });
}


function startApp() {
    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        render: h => h(App),
    });
}


function showError(err) {
    if (err) {
        Logger.error('Error starting Kiwi IRC:', err);
    } else {
        Logger.error('Unknown error starting Kiwi IRC');
    }

    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        render: h => h(StartupError),
    });
}
