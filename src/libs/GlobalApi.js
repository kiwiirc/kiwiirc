import eventEmitter from 'event-emitter';

let singletonInstance = null;

export default class GlobalApi {
    constructor() {
        eventEmitter(this);
        this.state = null;
        this.themes = null;
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
}
