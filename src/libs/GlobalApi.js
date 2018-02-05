import eventEmitter from 'event-emitter';
import Vue from 'vue';
import Logger from './Logger';

let singletonInstance = null;
let plugins = [];

export default class GlobalApi {
    constructor() {
        eventEmitter(this);
        this.Vue = Vue;
        this.state = null;
        this.themes = null;
        this.controlInputPlugins = [];
        this.stateBrowserPlugins = [];
        this.channelHeaderPlugins = [];
        this.queryHeaderPlugins = [];
        this.tabs = Object.create(null);
        this.isReady = false;

        this.on('init', () => {
            this.isReady = true;
            this.initPlugins();
        });
    }

    static singleton() {
        singletonInstance = singletonInstance || new GlobalApi();
        return singletonInstance;
    }

    plugin(pluginName, fn) {
        let plugin = { name: pluginName, fn: fn };
        if (this.isReady) {
            this.initPlugin(plugin);
        } else {
            plugins.push(plugin);
        }
    }

    // Init any plugins that were added before we were ready
    initPlugins() {
        plugins.forEach(plugin => this.initPlugin(plugin));
        plugins = [];
    }

    initPlugin(plugin) {
        let pluginLogger = Logger.namespace(`Plugin ${plugin.name}`);
        try {
            plugin.fn(this, pluginLogger);
        } catch (err) {
            pluginLogger.error(err.stack);
        }
    }

    setState(state) {
        this.state = state;
    }

    setThemeManager(themeManager) {
        this.themes = themeManager;
    }

    logLevel(newLevel) {
        Logger.setLevel(newLevel);
    }

    /**
     * addUi('input', domElement)
     * addUi('browser', domElement)
     * addUi('header_channel', domElement)
     * addUi('header_query', domElement)
     */
    addUi(type, element) {
        switch (type) {
        case 'input':
            this.controlInputPlugins.push(element);
            break;
        case 'browser':
            this.stateBrowserPlugins.push(element);
            break;
        case 'header_channel':
            this.channelHeaderPlugins.push(element);
            break;
        case 'header_query':
            this.queryHeaderPlugins.push(element);
            break;
        default:
            break;
        }
    }

    addTab(name, component, props) {
        this.tabs[name] = {
            component: Vue.extend(component),
            props: props || {},
        };
    }

    showTab(name) {
        // null disables any active component and reverts the UI back to the buffers
        let tab = this.tabs[name];
        if (tab) {
            this.state.$emit('active.component', tab.component, tab.props);
        } else {
            this.state.$emit('active.component', null);
        }
    }

    addStartup(name, ctor) {
        let startups = this.state.getStartups();
        startups[name] = ctor;
    }
}
