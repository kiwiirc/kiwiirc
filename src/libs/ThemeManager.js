import _ from 'lodash';

let createdInstance = null;

export default class ThemeManager {
    constructor(state) {
        this.state = state;
        this.listenForIrcEvents();
        this.varsEl = null;
    }

    themeVar(varName) {
        if (!this.varsEl) {
            this.varsEl = document.querySelector('.kiwi-wrap');
        }

        let styles = window.getComputedStyle(this.varsEl);
        let v = styles.getPropertyValue('--kiwi-' + varName);
        return (v || '').trim();
    }

    availableThemes() {
        return this.state.settings.themes;
    }

    currentTheme() {
        let state = this.state;
        let currentThemeName = state.setting('theme');
        currentThemeName = currentThemeName.toLowerCase();

        let theme = _.find(state.settings.themes, t => {
            let isMatch = t.name.toLowerCase() === currentThemeName;
            return isMatch;
        });

        // If no theme was set, use the first one in our theme list
        if (!theme) {
            theme = state.settings.themes[0];
        }

        return theme;
    }

    setTheme(theme) {
        let theTheme = null;

        if (typeof theme === 'string') {
            // Make sure this theme exists
            theTheme = _.find(this.availableThemes(), t => {
                let isMatch = t.name.toLowerCase() === theme.toLowerCase();
                return isMatch;
            });

            if (!theTheme) {
                return;
            }
        } else {
            theTheme = theme;
        }

        this.state.setting('theme', theTheme.name);
        this.state.$emit('theme.change');
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

        theme.url = url;
        this.state.$emit('theme.change');
    }

    themeUrl(theme) {
        let parts = theme.url.split('?');
        let url = parts[0];
        let qs = parts[1] || '';

        if (url[url.length - 1] !== '/') {
            url += '/';
        }
        return url + 'theme.css' + (qs ? '?' + qs : '');
    }

    setCustomThemeUrl(url) {
        let theme = _.find(ThemeManager.instance().availableThemes(), {
            name: 'custom',
        });

        if (theme) {
            theme.url = url;
        }

        if (theme.name === 'custom') {
            this.state.$emit('theme.change');
        }
    }

    // When we get a CTCP 'kiwi theme reload' then reload our theme. Handy for theme devs
    listenForIrcEvents() {
        this.state.$on('irc:ctcp request', (event, network) => {
            let ctcpType = (event.type || '').toLowerCase();
            if (ctcpType === 'kiwi' && event.message.indexOf('theme reload') > -1) {
                this.reload();
            }
        });
    }
}

ThemeManager.instance = function instance(state) {
    if (!createdInstance) {
        createdInstance = new ThemeManager(state);
    }

    return createdInstance;
};
