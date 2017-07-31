import eventEmitter from 'event-emitter';

let singletonInstance = null;

export default class GlobalApi {
    constructor() {
        eventEmitter(this);
        this.state = null;
        this.themes = null;
        this.controlInputPlugins = [];
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
    }

    setThemeManager(themeManager) {
        this.themes = themeManager;
    }

    addPlugin(type, element) {
        if (type === 'controlinput') {
            this.controlInputPlugins.push(element);
        }
    }
}
