import eventEmitter from 'event-emitter';
import Vue from 'vue';

let singletonInstance = null;

export default class GlobalApi {
    constructor() {
        eventEmitter(this);
        this.state = null;
        this.themes = null;
        this.controlInputPlugins = [];
        this.stateBrowserPlugins = [];
        this.channelHeaderPlugins = [];
        this.queryHeaderPlugins = [];
        this.tabs = Object.create(null);
    }

    static singleton() {
        singletonInstance = singletonInstance || new GlobalApi();
        return singletonInstance;
    }

    setState(state) {
        this.state = state;
    }

    setThemeManager(themeManager) {
        this.themes = themeManager;
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
