import _ from 'lodash';
import Vue from 'vue';
import i18next from 'i18next';
import i18nextXHR from 'i18next-xhr-backend';
import VueI18Next from '@panter/vue-i18next';

import AvailableLocales from 'src/res/locales/available.json';
import FallbackLocale from 'src/../static/locales/en-us.json';
import App from 'src/components/App';
import StartupError from 'src/components/StartupError';
import Logger from 'src/libs/Logger';
import ConfigLoader from 'src/libs/ConfigLoader';
import state from 'src/libs/state';
import ThemeManager from 'src/libs/ThemeManager';
import StatePersistence from 'src/libs/StatePersistence';
import * as Storage from 'src/libs/storage/Local';
import GlobalApi from 'src/libs/GlobalApi';

// Global utilities
import 'src/components/utils/TabbedView';
import 'src/components/utils/InputText';
import 'src/components/utils/IrcInput';
import 'src/components/utils/InputPrompt';

// Add the global API as soon as possible so that things can start listening to it
let api = window.kiwi = GlobalApi.singleton();

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

// Add a handy this.listen() fn to Vue instances. Saves on the need to add an event listener
// and then manually remove them all the time.
Vue.mixin({
    methods: {
        listen: function listen(source, event, fn) {
            this.listeningEvents = this.listeningEvents || [];
            this.listeningEvents.push(() => {
                (source.$off || source.off).call(source, event, fn);
            });
            (source.$on || source.on).call(source, event, fn);
        },
        listenOnce: function listenOnce(source, event, fn) {
            this.listeningEvents = this.listeningEvents || [];
            this.listeningEvents.push(() => {
                (source.$off || source.off).call(source, event, fn);
            });
            (source.$once || source.once).call(source, event, fn);
        },
    },
    beforeDestroy: function beforeDestroy() {
        (this.listeningEvents || []).forEach(fn => fn());
    },
});


loadApp();


function loadApp() {
    let configFile = 'static/config.json';
    let configObj = null;

    /**
     * Finding the config file
     * In order, looks in the following places:
     *   1. If a 'config' argument is in the query string, static/config_THEVALUE_.json
     *   2. If a window.kiwiConfig function exists, use it's return value as the config object.
     *   3. If a <meta name="kiwiconfig" content=""> is found, then the content becomes the config
     *      URL.
     *   4. If a <script name="kiwiconfig" type="application/json"></script> is found, then the
     *      content becomes the config JSON without making another web request.
     */
    if (getQueryVariable('config')) {
        configFile = 'static/config_' + getQueryVariable('config') + '.json';
    } else if (typeof window.kiwiConfig === 'function') {
        try {
            configObj = window.kiwiConfig();
        } catch (err) {
            Logger.error('Config file: ' + err.stack);
            showError();
        }
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
        .then(initState)
        .then(initLocales)
        .then(startApp)
        .catch(showError);
}


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


function initLocales() {
    Vue.use(VueI18Next);

    // Make the translation services available via the global API
    api.i18n = i18next;

    i18next.use(i18nextXHR);
    i18next.init({
        whitelist: AvailableLocales.locales,
        fallbackLng: 'en-us',
        lowerCaseLng: true,
        backend: {
            loadPath: 'static/locales/{{lng}}.json',

            // allow cross domain requests
            crossDomain: false,

            // allow credentials on cross domain requests
            withCredentials: false,
        },
    });

    // Build in the english translation so it can be used as a fallback
    i18next.addResourceBundle('en-us', 'translation', FallbackLocale);

    // Override the $t function so that empty translations fallback to en-us
    Vue.mixin({
        computed: {
            $t() {
                return (key, options) => {
                    let val = this.$i18n.i18next.t(key, options, this.$i18n.i18nLoadedAt);
                    if (!val) {
                        let opts = options || {};
                        opts.lng = 'en-us';
                        val = this.$i18n.i18next.t(key, opts, this.$i18n.i18nLoadedAt);
                    }
                    return val;
                };
            },
        },
    });

    if (state.setting('language')) {
        i18next.changeLanguage(state.setting('language'));
    }
}


async function initState() {
    let stateKey = state.settings.startupOptions.state_key;
    let persist = new StatePersistence(stateKey || '', state, Storage, Logger);
    if (stateKey) {
        await persist.loadStateIfExists();
    }

    api.setState(state);
}


function startApp() {
    let themeMgr = ThemeManager.instance(state);
    api.setThemeManager(themeMgr);

    let argTheme = getQueryVariable('theme');
    if (argTheme) {
        themeMgr.setTheme(argTheme);
    }

    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        render: h => h(App),
        i18n: new VueI18Next(i18next),
    });

    api.emit('ready');
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
