'kiwi public';

/** @module */

import EventEmitter from 'eventemitter3';
import Vue from 'vue';
import _ from 'lodash';
import compareVersions from 'compare-versions';
import * as Misc from '@/helpers/Misc';
import Logger from './Logger';

let singletonInstance = null;
let pluginsToInit = [];
let nextPluginId = 0;

/** The global kiwi API instance */
export default class GlobalApi extends EventEmitter {
    constructor() {
        super();

        // eslint-disable-next-line no-undef
        this.version = __VERSION__;

        /** A reference to the internal Vuejs instance */
        this.Vue = Vue;
        /** The applications internal state */
        this.state = null;
        /** The applications ThemeManager */
        this.themes = null;
        this.controlInputPlugins = [];
        this.stateBrowserPlugins = [];
        this.channelHeaderPlugins = [];
        this.queryHeaderPlugins = [];
        this.sideBarPlugins = [];
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
        pluginsToInit.forEach(plugin => this.initPlugin(plugin));
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

    /**
     * Add a DOM element to different parts of the Kiwi UI
     * - addUi('input', domElement)
     * - addUi('browser', domElement)
     * - addUi('header_channel', domElement)
     * - addUi('header_query', domElement)
     * @param {string} type Where this DOM element should be added
     * @param {element} element The HTML element to add
     * @param {object} args Optional arguments for this plugis
     */
    addUi(type, element, args = {}) {
        let plugin = {
            el: element,
            id: nextPluginId++,
            args,
        };

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
     * @param {Component} component The vuejs component that is displayed for this tab
     * @param {Object} props Optional properties for the vuejs component
     */
    addTab(type, title, component, props) {
        let plugin = {
            id: nextPluginId++,
            title,
            component,
            props,
        };

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
     * @param {Component} component The vuejs component to create the view
     * @param {Object} props Optional properties the the vuejs component
     */
    addView(name, component, props) {
        this.tabs[name] = {
            id: nextPluginId++,
            component: Vue.extend(component),
            props: props || {},
        };
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
     * Show a Vuejs component in the sidebar
     * @param {Object} component The vuejs component to render
     */
    showInSidebar(component) {
        this.state.$emit('sidebar.component', component);
    }

    /**
     * Add a custom startup screen that may be loaded by the configuration file
     * @param {String} name The name of this startup screen
     * @param {Object} ctor The constructor object for the vuejs component
     */
    addStartup(name, ctor) {
        let startups = this.state.getStartups();
        startups[name] = ctor;
    }

    /**
     *
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
}
