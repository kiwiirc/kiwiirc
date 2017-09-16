import eventEmitter from 'event-emitter';

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
            this.channelHeadPlugins.forEach(el => e.container.addChannelPlugin(el));
            this.privateHeadPlugins.forEach(el => e.container.addPrivatePlugin(el));
        });
    }

    setThemeManager(themeManager) {
        this.themes = themeManager;
    }

    addPlugin(type, element) {
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
        default:
            break;
        }
    }

    addStartup(name, ctor) {
        let startups = this.state.getStartups();
        startups[name] = ctor;
    }
}
