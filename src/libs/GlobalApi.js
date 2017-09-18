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
        this.channelHeadPlugins = [];
        this.privateHeadPlugins = [];
        this.tabs = Object.create(null);
    }

    static singleton() {
        singletonInstance = singletonInstance || new GlobalApi();
        return singletonInstance;
    }

    setState(state) {
        this.state = state;
        this.state.$on('controlinput:show', e => {
            this.controlInputPlugins.forEach(el => e.controlinput.addPlugin(el));
        });
        this.state.$on('statebrowser:show', e => {
            this.stateBrowserPlugins.forEach(el => e.statebrowser.addPlugin(el));
        });
        this.state.$on('containerheader:show', e => {
            if (e.container.isChannel()) {
                this.channelHeadPlugins.forEach(el => e.container.addPlugin(el));
            }
            if (e.container.isQuery()) {
                this.privateHeadPlugins.forEach(el => e.container.addPlugin(el));
            }
        });
    }

    setThemeManager(themeManager) {
        this.themes = themeManager;
    }

    changeWindow(name) {
        this.state.$emit('active.component', this.tabs[name]);
    }

    addPlugin(type, element, opts) {
        switch (type) {
        case 'controlinput':
            this.controlInputPlugins.push(element);
            break;
        case 'statebrowser':
            this.stateBrowserPlugins.push(element);
            break;
        case 'channelhead':
            this.channelHeadPlugins.push(element);
            break;
        case 'privatehead':
            this.privateHeadPlugins.push(element);
            break;
        case 'tab':
            this.tabs[element] = Vue.component(element, opts || {});
            break;
        default:
            break;
        }
    }

    addStartup(name, ctor) {
        let startups = this.state.getStartups();
        startups[name] = ctor;
    }
}
