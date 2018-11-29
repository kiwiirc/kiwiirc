import _ from 'lodash';
import Vue from 'vue';
import i18next from 'i18next';
import i18nextXHR from 'i18next-xhr-backend';
import VueI18Next from '@panter/vue-i18next';
import AvailableLocales from '@/res/locales/available.json';
import FallbackLocale from '@/../static/locales/en-us.json';
import Logger from '@/libs/Logger';
import state from '@/libs/state';
import ThemeManager from '@/libs/ThemeManager';
import InputHandler from '@/libs/InputHandler';
import StatePersistence from '@/libs/StatePersistence';
import * as Storage from '@/libs/storage/Local';
import * as Misc from '@/helpers/Misc';
import GlobalApi from '@/libs/GlobalApi';
import { AudioManager } from '@/libs/AudioManager';
import { SoundBleep } from '@/libs/SoundBleep';

// Global utilities
import '@/components/utils/TabbedView';
import '@/components/utils/InputText';
import '@/components/utils/IrcInput';
import '@/components/utils/InputPrompt';
import '@/components/utils/InputConfirm';

let log = Logger.namespace('main');
let api = window.kiwi = GlobalApi.singleton();

// Third party imports now have access to the state and api
/* eslint-disable import/first */
import '@/thirdparty/';

export function getQueryVariable(variable) {
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

// Make the state available to all components by default
Vue.mixin({
    computed: {
        $state() {
            return state;
        },
    },
});

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

export function initSound() {
    let sound = new SoundBleep();
    let bleep = new AudioManager(sound);

    bleep.listen(state);
    bleep.listenForHighlights(state);
}

export function initInputCommands() {
    /* eslint-disable no-new */
    new InputHandler(state);
}

export async function initState() {
    let stateKey = state.settings.startupOptions.state_key;

    // Default to a preset key if it wasn't set
    if (typeof stateKey === 'undefined') {
        stateKey = 'kiwi-state';
    }

    let persistLog = Logger.namespace('StatePersistence');
    let persist = new StatePersistence(stateKey || '', state, Storage, persistLog);
    persist.includeBuffers = !!state.settings.startupOptions.remember_buffers;

    if (stateKey) {
        await persist.loadStateIfExists();
    }

    api.setState(state);
}

export function loadPlugins() {
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
                fetch(plugin.url).then(response => response.text()).then((pluginRaw) => {
                    let el = document.createElement('div');
                    el.id = 'kiwi_plugin_' + plugin.name.replace(/[ "']/g, '');
                    el.style.display = 'none';
                    el.innerHTML = pluginRaw;

                    // The browser won't execute any script
                    // elements so we need to extract them and
                    // place them into the DOM using our own script elements
                    el.querySelectorAll('script').forEach((limitedScr) => {
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

export function applyConfig(config) {
    Misc.dedotObject(config);
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

export function initLocales() {
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
}

export function initThemes() {
    let themeMgr = ThemeManager.instance(state);
    api.setThemeManager(themeMgr);

    let argTheme = getQueryVariable('theme');
    if (argTheme) {
        themeMgr.setTheme(argTheme);
    }
}
