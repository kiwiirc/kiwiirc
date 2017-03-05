import _ from 'lodash';

let createdInstance = null;

export default class ThemeManager {
    constructor(state) {
        this.state = state;
    }

    availableThemes() {
        return this.state.themes;
    }

    currentTheme() {
        let state = this.state;
        let currentThemeName = state.user_settings.theme || state.settings.theme;

        // If no theme was set, use the first one in our theme list
        if (!currentThemeName) {
            currentThemeName = state.themes[0].name;
        }

        currentThemeName = currentThemeName.toLowerCase();

        return _.find(state.settings.themes, t => {
            let isMatch = t.name.toLowerCase() === currentThemeName;
            return isMatch;
        });
    }

    setTheme(themeName) {
        // Make sure this theme exists
        let themeExists = !!_.find(this.state.themes, t => {
            let isMatch = t.name.toLowerCase() === themeName.toLowerCase();
            return isMatch;
        });

        if (!themeExists) {
            return;
        }

        this.state.user_settings.theme = themeName;
    }

    reload() {
        let theme = this.currentTheme();
        if (!theme) {
            return;
        }

        let url = theme.url;
        if (url.indexOf('cb=') > -1) {
            url = url.replace(/cb=[0-9]+/, () => 'cb=' + Date.now());
        } else if (url.indexOf('?') > -1) {
            url += '&cb=' + Date.now();
        } else {
            url += '?cb=' + Date.now();
        }
    }
}

ThemeManager.instance = function instance(state) {
    if (!createdInstance) {
        createdInstance = new ThemeManager(state);
    }

    return createdInstance;
};
