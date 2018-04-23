import _ from 'lodash';
import Vue from 'vue';
import i18next from 'i18next';
import i18nextXHR from 'i18next-xhr-backend';
import VueI18Next from '@panter/vue-i18next';

import AvailableLocales from '@/res/locales/available.json';
import FallbackLocale from '@/../static/locales/en-us.json';
import App from '@/components/App';
import StartupError from '@/components/StartupError';
import Logger from '@/libs/Logger';
import ConfigLoader from '@/libs/ConfigLoader';
import state from '@/libs/state';
import ThemeManager from '@/libs/ThemeManager';
import StatePersistence from '@/libs/StatePersistence';
import * as Storage from '@/libs/storage/Local';
import GlobalApi from '@/libs/GlobalApi';

// Global utilities
import '@/components/utils/TabbedView';
import '@/components/utils/InputText';
import '@/components/utils/IrcInput';
import '@/components/utils/InputPrompt';

let logLevelMatch = window.location.href.match(/kiwi-loglevel=(\d)/);
if (logLevelMatch && logLevelMatch[1]) {
    Logger.setLevel(parseInt(logLevelMatch[1], 10));
}

let log = Logger.namespace('main');

// Add the global API as soon as possible so that things can start listening to it
let api = window.kiwi = GlobalApi.singleton();

// Third party imports now have access to the state and api
/* eslint-disable import/first */
import '@/thirdparty/';

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
    beforeDestroy: function beforeDestroy() {
        (this.listeningEvents || []).forEach(fn => fn());
    },
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
});

// Allow adding existing raw elements to component templates
// Eg: <div v-rawElement="domElement"></div>
Vue.directive('rawElement', {
    bind(el, binding) {
        el.appendChild(binding.value);
    },
});

// Register a global custom directive called `v-focus`
Vue.directive('focus', {
    // When the bound element is inserted into the DOM...
    inserted(el) {
        // Element is input so focus it
        if (el.tagName === 'INPUT') {
            el.focus();
            return;
        }
        // Try to focus the first input element
        let input = el.getElementsByTagName('input')[0];
        if (input) {
            input.focus();
        }
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
            log.error('Config file: ' + err.stack);
            showError();
        }
    } else if (document.querySelector('meta[name="kiwiconfig"]')) {
        configFile = document.querySelector('meta[name="kiwiconfig"]').content;
    } else if (document.querySelector('script[name="kiwiconfig"]')) {
        let configContents = document.querySelector('script[name="kiwiconfig"]').innerHTML;

        try {
            configObj = JSON.parse(configContents);
        } catch (parseErr) {
            log.error('Config file: ' + parseErr.stack);
            showError();
        }
    }

    let configLoader = new ConfigLoader();
    (configObj ? configLoader.loadFromObj(configObj) : configLoader.loadFromUrl(configFile))
        .then(applyConfig)
        .then(initState)
        .then(initLocales)
        .then(loadPlugins)
        .then(startApp)
        .catch(showError);
}

function applyConfig(config) {
    applyConfigObj(config, state.settings);

    // Update the window title if we have one
    if (state.settings.windowTitle) {
        window.document.title = state.settings.windowTitle;
    }
    state.$watch('settings.windowTitle', (newVal) => {
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

function loadPlugins() {
    return new Promise((resolve, reject) => {
        let plugins = state.settings.plugins || [];
        let pluginIdx = -1;

        loadNextScript();

        function loadNextScript(sSrc, fOnload) {
            let plugin = plugins[++pluginIdx];

            if (!plugin) {
                resolve();
                return;
            }

            let scr = document.createElement('script');
            scr.onerror = () => {
                log.error(`Error loading plugin '${plugin.name}' from '${plugin.url}'`);
                loadNextScript();
            };
            scr.onload = () => {
                loadNextScript();
            };

            document.body.appendChild(scr);
            scr.src = plugin.url;
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
        interpolation: {
            // We let vuejs handle HTML output escaping
            escapeValue: false,
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

    let defaultLang = state.setting('language');
    let preferredLangs = (window.navigator && window.navigator.languages) || [];
    let preferredLang = preferredLangs[0];

    if (defaultLang) {
        i18next.changeLanguage(defaultLang, (err, t) => {
            if (err) {
                i18next.changeLanguage('en-us');
            }
        });
    } else if (preferredLang) {
        i18next.changeLanguage(preferredLang, (err, t) => {
            if (err) {
                i18next.changeLanguage('en-us');
            }
        });
    }
}

async function initState() {
    let stateKey = state.settings.startupOptions.state_key;

    let persistLog = Logger.namespace('StatePersistence');
    let persist = new StatePersistence(stateKey || '', state, Storage, persistLog);
    persist.includeBuffers = !!state.settings.startupOptions.remember_buffers;

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

    api.emit('init');

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
        log.error('Error starting Kiwi IRC:', err);
    } else {
        log.error('Unknown error starting Kiwi IRC');
    }

    /* eslint-disable no-new */
    new Vue({
        el: '#app',
        render: h => h(StartupError),
    });
}
