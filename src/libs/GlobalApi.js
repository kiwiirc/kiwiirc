'kiwi public';

/** @module */

import EventEmitter from 'eventemitter3';
import Vue from 'vue';
import JSON5 from 'json5';
import _ from 'lodash';
import { compareVersions } from 'compare-versions';
import * as Misc from '@/helpers/Misc';
import Logger from './Logger';

let singletonInstance = null;
let pluginsToInit = [];
let nextPluginId = 0;

/** The global kiwi API instance */
export default class GlobalApi extends EventEmitter {
    constructor() {
        super();

        // Version information from DefinePlugin in vue.config.js
        this.version = __VERSION__; // eslint-disable-line no-undef
        this.commithash = __COMMITHASH__; // eslint-disable-line no-undef

        /** A reference to the internal Vuejs instance */
        this.Vue = Vue;
        /** Expose JSON5 so that plugins can use the same config format */
        this.JSON5 = JSON5;
        /** The applications internal state */
        this.state = null;
        /** The applications ThemeManager */
        this.themes = null;
        /** Translations library */
        this.i18n = null;
        this.vueI18n = null;
        this.translationUrls = Object.create(null);

        this.controlInputPlugins = [];
        this.stateBrowserPlugins = [];
        this.channelHeaderPlugins = [];
        this.queryHeaderPlugins = [];
        this.sideBarPlugins = [];
        this.userboxButtonPlugins = [];
        this.userboxInfoPlugins = [];
        this.userboxWhoisPlugins = [];
        this.appSettingsPlugins = [];
        this.serverViewPlugins = [];
        this.aboutBufferPlugins = [];
        this.tabs = Object.create(null);
        this.isReady = false;
        /* eslint-disable no-underscore-dangle */
        this.exports = window._kiwi_exports || {};

        this.on('init', () => {
            this.isReady = true;
            this.initPlugins();
        });
    }

    static singleton() {
        singletonInstance = singletonInstance || new GlobalApi();
        return singletonInstance;
    }

    versionMatches(v) {
        return compareVersions(this.version, v) >= 0;
    }

    /**
     * Register a plugin with kiwi
     *
     * Plugins being loaded at startup will be registered once Kiwi is ready. At any
     * other point the plugin will be registered instantly
     * @param {String} pluginName The name of this plugin
     * @param {Function} fn A callback function to start the plugin. function(kiwi, logger)
     */
    plugin(pluginName, fn) {
        let plugin = { name: pluginName, fn: fn };
        if (this.isReady) {
            this.initPlugin(plugin);
        } else {
            pluginsToInit.push(plugin);
        }
    }

    // Init any plugins that were added before we were ready
    initPlugins() {
        pluginsToInit.forEach((plugin) => this.initPlugin(plugin));
        pluginsToInit = [];
    }

    initPlugin(plugin) {
        let pluginLogger = Logger.namespace(`Plugin ${plugin.name}`);
        try {
            plugin.fn(this, pluginLogger);
            this.state.$emit('plugin.loaded', { name: plugin.name });
        } catch (err) {
            pluginLogger.error(err.stack);
        }
    }

    /**
     * Get a reference to an internal Kiwi module
     *
     * E.g. require('helpers/TextFormatting');
     * @param {String} mod The module path
     */
    require(modPath) {
        let path = modPath.replace(/\//g, '.');
        let mod = _.get(this.exports, path);
        if (typeof mod === 'undefined') {
            Logger.error('Module does not exist: ' + modPath);
        }

        return mod;
    }

    setState(state) {
        this.state = state;

        // Hacky, but since Vues emitter doesnt support 'all', hijack its $emit call
        // so that we can forward the event on to plugins
        let stateEmit = this.state.$emit;
        let thisEmit = this.emit;

        this.state.$emit = (...args) => {
            try {
                thisEmit.call(this, 'all', args[0], ...args.slice(1));
                thisEmit.call(this, ...args);
            } catch (err) {
                Logger.error(err.stack);
            }

            return stateEmit.call(this.state, ...args);
        };

        // Let plugins emit events into the internal state
        this.emit = (...args) => {
            stateEmit.call(this.state, ...args);
            thisEmit.call(this, ...args);
        };
    }

    setThemeManager(themeManager) {
        this.themes = themeManager;
    }

    /**
     * Change the logging level output
     * @param {number} newLevel The new logging level
     */
    logLevel(newLevel) {
        Logger.setLevel(newLevel);
    }

    get log() {
        return Logger;
    }

    /**
     * Add a DOM element to different parts of the Kiwi UI
     * - addUi('input', componentObject)
     * - addUi('browser', componentObject)
     * - addUi('header_channel', componentObject)
     * - addUi('header_query', componentObject)
     * - addUi('userbox_button', componentObject)
     * - addUi('about_buffer', componentObject)
     * @param {string} type Where this component should be added
     * @param {object} component The vue.js component object
     * @param {object} args Optional arguments for this plugin { title: '', props: {} }
     */
    addUi(type, component, args = {}) {
        const plugin = Misc.makePluginObject(nextPluginId++, component, args);

        switch (type) {
        case 'input':
            this.controlInputPlugins.push(plugin);
            break;
        case 'browser':
            this.stateBrowserPlugins.push(plugin);
            break;
        case 'header_channel':
            this.channelHeaderPlugins.push(plugin);
            break;
        case 'header_query':
            this.queryHeaderPlugins.push(plugin);
            break;
        case 'userbox_button':
            this.userboxButtonPlugins.push(plugin);
            break;
        case 'userbox_info':
            this.userboxInfoPlugins.push(plugin);
            break;
        case 'userbox_whois':
            this.userboxWhoisPlugins.push(plugin);
            break;
        case 'about_buffer':
            this.aboutBufferPlugins.push(plugin);
            break;
        default:
            break;
        }
    }

    /**
     * Add a Vue component as a tab to different tabbed views in the Kiwi API
     * - addTab('channel', 'title', component, props)
     * - addTab('settings', 'title', component, props)
     * - addTab('server', 'title', component, props)
     * @param {String} type The type of tab to add. This determines where it will be shown
     * @param {String} title The title shown on the tab
     * @param {Object} component The vue.js component object that is displayed in this tab
     * @param {Object} props Optional properties for the vue.js component
     */
    addTab(type, title, component, props) {
        const plugin = Misc.makePluginObject(nextPluginId++, component, { props, title });

        switch (type) {
        case 'channel':
            this.sideBarPlugins.push(plugin);
            break;
        case 'settings':
            this.appSettingsPlugins.push(plugin);
            break;
        case 'server':
            this.serverViewPlugins.push(plugin);
            break;
        default:
            break;
        }
    }

    /**
     * Register a Vue component that may be shown in future. It is shown over the entire
     * client alongside the StateBrowser
     * @param {String} name A name to reference this view in future
     * @param {Object} component The vue.js component object to create the view
     * @param {Object} props Optional properties the the vue.js component
     */
    addView(name, component, props) {
        const plugin = Misc.makePluginObject(nextPluginId++, component, { props });
        this.tabs[name] = plugin;
    }

    /**
     * Show a previously registered view
     * @param {String} name The name of previously registered view to show
     */
    showView(name) {
        // null disables any active component and reverts the UI back to the buffers
        let tab = this.tabs[name];
        if (tab) {
            this.state.$emit('active.component', tab.component, tab.props);
        } else {
            this.state.$emit('active.component', null);
        }
    }

    /**
     * Show a Vue.js component in the sidebar
     * @param {Object} component The vue.js component object to render
     * @param {Object} props Optional properties for the vue.js component
     */
    showInSidebar(component, props) {
        const plugin = Misc.makePluginObject(0, component, { props });
        this.state.$emit('sidebar.component', plugin.component, plugin.props);
    }

    /**
     * Add a custom startup screen that may be loaded by the configuration file
     * @param {String} name The name of this startup screen
     * @param {Object} component The vue.js component object
     */
    addStartup(name, component) {
        const plugin = Misc.makePluginObject(0, component);
        let startups = this.state.getStartups();
        startups[name] = plugin.component;
    }

    /**
     * Replace an existing kiwiirc component/module with a custom one
     * @param {String} dest The module path to replace
     * @param {Object} source The new module to insert in place
     */
    replaceModule(dest, source) {
        let mod = this.require(dest);
        if (!mod) {
            throw new Error(`The module ${dest} does not exist`);
        }

        Misc.replaceObjectProps(mod, source);
    }

    /**
     * Add default config params for a plugin
     * @param {String} namespace Base config location eg: 'plugin-conference'
     * @param {Object} defaultConfig Configuration object
     */
    setConfigDefaults(namespace, defaultConfig) {
        let base = `settings.${namespace}`;
        let getSetting = (key) => this.state.getSetting(`${base}.${key}`);
        let setSetting = (key, value) => this.state.setSetting(`${base}.${key}`, value);
        let walkConfig = (obj, _target) => {
            _.each(obj, (val, key) => {
                let target = [..._target, key];
                let targetName = target.join('.');
                if (typeof val === 'object' && !_.isArray(val)) {
                    walkConfig(val, target);
                } else if (typeof getSetting(targetName) === 'undefined') {
                    setSetting(targetName, val);
                }
            });
        };
        walkConfig(defaultConfig, []);
    }

    /**
     * Add translations for use in a plugin
     * @param {String} namespace Translations namespace eg: 'plugin-conference'
     * @param {Object} translations Translations object
     */
    addTranslations(namespace, translations) {
        Object.entries(translations).forEach(([lang, data]) => {
            this.i18n.addResourceBundle(lang, namespace, data);
        });
    }

    /**
     * Add url path to translation files
     * @param {String} namespace Translations namespace eg: 'plugin-conference'
     * @param {String} url Translations url path, supported replacements: {{lng}} {{ns}}
     * @param {Object} fallbackLocale Optional fallback 'en-us' locale data from bundle
     */
    addTranslationFiles(namespace, url, fallbackLocale) {
        if (!url.includes('{{lng}}')) {
            this.log.error('A plugin tried to addTranslationsFiles() without {{lng}} in the url');
            return;
        }
        this.translationUrls[namespace] = url;
        if (fallbackLocale) {
            this.i18n.addResourceBundle('en-us', namespace, fallbackLocale);
        }
        this.i18n.loadNamespaces(namespace);
    }
}
