import _ from 'lodash';
import Vue from 'vue';

import App from 'src/components/App';
import StartupError from 'src/components/StartupError';
import Logger from 'src/libs/Logger';
import ConfigLoader from 'src/libs/ConfigLoader';
import state from 'src/libs/state';

// Global utilities
import 'src/components/utils/TabbedView';
import 'src/components/utils/InputText';

// A handy debugging var..
window.state = state;

function getQueryVariable(variable) {
    let query = window.location.search.substring(1);
    let vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
        let pair = vars[i].split('=');
        if (pair[0] === variable) {
            return pair[1];
        }
    }

    return false;
}

let configFile = 'static/config.json';
let configObj = null;

/**
 * Finding the config file
 * In order, looks in the following places:
 *   1. If a 'config' argument is in the query string, static/config_THEVALUE_.json
 *   2. If a <meta name="kiwiconfig" content=""> is found, then the content becomes the config URL.
 *   3. If a <script name="kiwiconfig" type="application/json"></script> is found, then the content
 *      becomes the config JSON without making another web request.
 */
if (getQueryVariable('config')) {
    configFile = 'static/config_' + getQueryVariable('config') + '.json';
} else if (document.querySelector('meta[name="kiwiconfig"]')) {
    configFile = document.querySelector('meta[name="kiwiconfig"]').content;
} else if (document.querySelector('script[name="kiwiconfig"]')) {
    let configContents = document.querySelector('script[name="kiwiconfig"]').innerHTML;

    try {
        configObj = JSON.parse(configContents);
    } catch (parseErr) {
        Logger.error('Config file: ' + parseErr.stack);
        showError();
    }
}

let configLoader = new ConfigLoader();
(configObj ? configLoader.loadFromObj(configObj) : configLoader.loadFromUrl(configFile))
    .then(applyConfig)
	.then(startApp)
	.catch(showError);


function applyConfig(config) {
    applyConfigObj(config, state.settings);

    // Update the window title if we have one
    if (state.settings.windowTitle) {
        window.document.title = state.settings.windowTitle;
    }
    state.$watch('settings.windowTitle', newVal => {
        window.document.title = newVal;
    });
}


// Recursively merge an object onto another via Vue.$set
function applyConfigObj(obj, target) {
    _.each(obj, (val, key) => {
        if (typeof val === 'object') {
            if (typeof target[key] !== 'object') {
                // Create the correct type of object
                let newVal = _.isArray(val) ?
                    [] :
                    {};

                Vue.set(target, key, newVal);
            }
            applyConfigObj(val, target[key]);
        } else {
            Vue.set(target, key, val);
        }
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
