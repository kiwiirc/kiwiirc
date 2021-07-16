import _ from 'lodash';
import Vue from 'vue';
import JSON5 from 'json5';
import i18next from 'i18next';
import i18nextXHR from 'i18next-xhr-backend';
import VueI18Next from '@panter/vue-i18next';
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

// fetch polyfill
import 'whatwg-fetch';
// polyfill for vue-virtual-scroller & ie11
import 'intersection-observer';

import AvailableLocales from '@/res/locales/available.json';
import FallbackLocale from '@/../static/locales/en-us.json';
import App from '@/components/App';
import startupScreens from '@/components/startups/';
import StartupError from '@/components/StartupError';
import Logger from '@/libs/Logger';
import ConfigLoader from '@/libs/ConfigLoader';
import getState from '@/libs/state';
import ThemeManager from '@/libs/ThemeManager';
import InputHandler from '@/libs/InputHandler';
import StatePersistence from '@/libs/StatePersistence';
import * as Storage from '@/libs/storage/Local';
import * as Misc from '@/helpers/Misc';
import GlobalApi from '@/libs/GlobalApi';
import { AudioManager } from '@/libs/AudioManager';
import { SoundBleep } from '@/libs/SoundBleep';
import WindowTitle from '@/libs/WindowTitle';
import { configTemplates } from '@/res/configTemplates';

// Global utilities
import '@/components/utils/TabbedView';
import '@/components/utils/InputText';
import '@/components/utils/IrcInput';
import '@/components/utils/InputPrompt';
import '@/components/utils/InputConfirm';

Vue.use(VueVirtualScroller);

let logLevelMatch = window.location.href.match(/kiwi-loglevel=(\d)/);
if (logLevelMatch && logLevelMatch[1]) {
    let newLevel = parseInt(logLevelMatch[1], 10);
    Logger.setLevel(newLevel);
    Logger('Logging level set to', newLevel);
}

let log = Logger.namespace('main');

// Add the global API as soon as possible so that things can start listening to it
let api = window.kiwi = GlobalApi.singleton();

// Will be set by selectStartupScreen()
let startupScreen = null;

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
        (this.listeningEvents || []).forEach((fn) => fn());
    },
    methods: {
        listen: function listen(source, event, fn) {
            this.listeningEvents = this.listeningEvents || [];
            let off = () => {
                (source.removeEventListener || source.$off || source.off).call(source, event, fn);
            };
            this.listeningEvents.push(off);
            (source.addEventListener || source.$on || source.on).call(source, event, fn);
            return off;
        },
        listenOnce: function listenOnce(source, event, _fn) {
            let fn = _fn;
            this.listeningEvents = this.listeningEvents || [];
            let off = () => {
                (source.removeEventListener || source.$off || source.off).call(source, event, fn);
            };
            this.listeningEvents.push(off);

            if (source.addEventListener) {
                // Create our own once handler as the DOM doesn't support this itself
                fn = function onceFn(...args) {
                    source.removeEventListener(event, onceFn);
                    fn(...args);
                };

                source.addEventListener(event, fn);
            } else {
                (source.$once || source.once).call(source, event, fn);
            }

            return off;
        },
    },
});

// Timer functions that are auto cleaned up when a component is destroyed
Vue.mixin({
    beforeDestroy: function beforeDestroy() {
        (this.timerEvents || []).forEach((tmr) => clearTimeout(tmr));
    },
    methods: {
        setInterval(...args) {
            this.timerEvents = this.timerEvents || [];
            let v = setInterval(...args);
            this.timerEvents.push(v);
            return v;
        },
        setTimeout(...args) {
            this.timerEvents = this.timerEvents || [];
            let v = setTimeout(...args);
            this.timerEvents.push(v);
            return v;
        },
    },
});

// Make the state available to all components by default
Vue.mixin({
    computed: {
        $state() {
            return getState();
        },
    },
});

// Allow adding existing raw elements to component templates
// Eg: <div v-rawElement="domElement"></div>
// Eg: <div v-rawElement="{el: domElement, data:{foo:'bar'}}"></div>
Vue.directive('rawElement', {
    bind(el, binding) {
        if (binding.value.nodeName) {
            el.appendChild(binding.value);
        } else if (binding.value.el) {
            let rawEl = binding.value.el;
            el.appendChild(rawEl);

            // Add any data attributes to the raw element
            if (binding.value.data) {
                Object.keys(binding.value.data).forEach((key) => {
                    rawEl.dataset[key] = binding.value.data[key];
                });
            }

            // Add any properties to the raw element
            if (binding.value.props) {
                Object.keys(binding.value.props).forEach((key) => {
                    rawEl[key] = binding.value.props[key];
                });
            }
        }
    },
});

// Register a global custom directive called `v-focus`
Vue.directive('focus', {
    // Support conditional eg. v-focus="false"
    bind(el, bindings) {
        el.dataset.focus = bindings.value === undefined || !!bindings.value;
    },
    // When the bound element is inserted into the DOM...
    inserted(el) {
        // dataset properties are strings
        if (el.dataset.focus !== 'true') {
            return;
        }
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

let ROSymbol = Symbol('resizeobserver');
Vue.directive('resizeobserver', {
    bind(el, bindings) {
        let cb = bindings.value || function noop() {};
        el[ROSymbol] = new ResizeObserver(cb);
        el[ROSymbol].observe(el);
    },
    unbind(el) {
        el[ROSymbol].unobserve(el);
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
            configObj = JSON5.parse(configContents);
        } catch (parseErr) {
            log.error('Config file: ' + parseErr.stack);
            showError();
        }
    }

    let configLoader = new ConfigLoader();
    configLoader
        .addValueReplacement('protocol', window.location.protocol)
        .addValueReplacement('wsprotocol', window.location.protocol === 'https:' ? 'wss:' : 'ws:')
        .addValueReplacement('tls', window.location.protocol === 'https:')
        .addValueReplacement('hostname', window.location.hostname)
        .addValueReplacement('host', window.location.host)
        .addValueReplacement('port', window.location.port || (
            window.location.protocol === 'https:' ?
                443 :
                80
        ))
        .addValueReplacement('hash', (window.location.hash || '').substr(1))
        .addValueReplacement('query', (window.location.search || '').substr(1))
        .addValueReplacement('referrer', window.document.referrer);

    (configObj ? configLoader.loadFromObj(configObj) : configLoader.loadFromUrl(configFile))
        .then(applyConfig)
        .then(initState)
        .then(loadPlugins)
        .then(selectStartupScreen)
        .then(initStatePersistence)
        .then(initInputCommands)
        .then(initLocales)
        .then(initThemes)
        .then(initSound)
        .then(startApp)
        .catch(showError);
}

function applyConfig(config) {
    Misc.dedotObject(config);
    // if we have a config template apply that before other configs
    if (configTemplates[config.template]) {
        applyConfigObj(configTemplates[config.template], getState().settings);
    }
    applyConfigObj(config, getState().settings);
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
        let plugins = getState().settings.plugins || [];
        let pluginIdx = -1;

        loadNextScript();

        function loadNextScript(sSrc, fOnload) {
            let plugin = plugins[++pluginIdx];

            if (!plugin) {
                // All plugins loaded, let them init themselves
                api.emit('init');

                resolve();
                return;
            }

            if (plugin.url.indexOf('.js') > -1) {
                // The plugin is a .js file so inject it as a script
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
            } else {
                // Treat the plugin as a HTML document and just inject it into the document
                fetch(plugin.url).then((response) => response.text()).then((pluginRaw) => {
                    let el = document.createElement('div');
                    el.id = 'kiwi_plugin_' + plugin.name.replace(/[ "']/g, '');
                    el.style.display = 'none';
                    el.innerHTML = pluginRaw;

                    // The browser won't execute any script elements so we need to extract them and
                    // place them into the DOM using our own script elements
                    let scripts = [...el.querySelectorAll('script')];

                    // IE11 does not support nodes.forEach()
                    scripts.forEach((limitedScr) => {
                        limitedScr.parentElement.removeChild(limitedScr);
                        let scr = document.createElement('script');
                        scr.text = limitedScr.text;
                        el.appendChild(scr);
                    });

                    document.body.appendChild(el);
                    loadNextScript();
                }).catch(() => {
                    log.error(`Error loading plugin '${plugin.name}' from '${plugin.url}'`);
                    loadNextScript();
                });
            }
        }
    });
}

async function selectStartupScreen() {
    let state = getState();
    let extraStartupScreens = state.getStartups();
    let startupName = state.settings.startupScreen || 'personal';
    let startup = extraStartupScreens[startupName] || startupScreens[startupName];

    if (!startup) {
        Logger.error(`Startup screen "${startupName}" does not exist`);
        return;
    }

    if (typeof startup.methods.initKiwi === 'function') {
        await startup.methods.initKiwi(state);
    }

    startupScreen = startup;
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

    const setDefaultLanguage = () => {
        let defaultLang = getState().setting('language');
        let preferredLangs = _.clone(window.navigator && window.navigator.languages) || [];

        // our configs default lang overrides all others
        if (defaultLang) {
            preferredLangs.unshift(defaultLang);
        }

        // set a default language
        i18next.changeLanguage('en-us');

        // Go through our browser languages until we find one that we support
        for (let idx = 0; idx < preferredLangs.length; idx++) {
            let lang = preferredLangs[idx];

            // if this is a language such as 'fr', add a following one of 'fr-fr' to cover
            // both cases
            if (lang.length === 2) {
                preferredLangs.splice(idx + 1, 0, lang + '-' + lang);
            }

            if (_.includes(AvailableLocales.locales, lang.toLowerCase())) {
                i18next.changeLanguage(lang, (err, t) => {
                    if (err) {
                        // setting the language failed so set default again
                        i18next.changeLanguage('en-us');
                    }
                });
                break;
            }
        }
    };
    setDefaultLanguage();

    // Update the language if the setting changes.
    getState().$watch('user_settings.language', (lang) => {
        if (!lang && !getState().setting('language')) {
            setDefaultLanguage();
        } else {
            i18next.changeLanguage(lang || getState().setting('language') || 'en-us');
        }
    });
}

async function initState() {
    let state = getState();
    api.setState(state);
}

async function initStatePersistence() {
    let state = getState();
    let stateKey = state.settings.startupOptions.state_key;

    // Default to a preset key if it wasn't set
    if (typeof stateKey === 'undefined') {
        stateKey = 'kiwi-state';
    }

    let persistLog = Logger.namespace('StatePersistence');
    let persist = new StatePersistence(stateKey || '', state, Storage, persistLog);
    persist.includeBuffers = !!state.settings.startupOptions.remember_buffers;

    if (stateKey) {
        persist.loadStateIfExists();
    }
}

function initThemes() {
    let themeMgr = ThemeManager.instance(getState());
    api.setThemeManager(themeMgr);

    let argTheme = getQueryVariable('theme');
    if (argTheme) {
        themeMgr.setTheme(argTheme);
    }
}

function initSound() {
    let sound = new SoundBleep();
    let bleep = new AudioManager(sound);

    bleep.listen(getState());
    bleep.watchForMessages(getState());
}

function initInputCommands() {
    /* eslint-disable no-new */
    new InputHandler(getState());
}

function startApp() {
    new WindowTitle(getState());

    let AppComp = Vue.extend(App);
    let app = new AppComp({
        propsData: {
            startupComponent: startupScreen,
        },
        i18n: new VueI18Next(i18next),
    });
    app.$mount('#app');

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
        render: (h) => h(
            StartupError,
            { props: { error: err } },
        ),
    });
}
