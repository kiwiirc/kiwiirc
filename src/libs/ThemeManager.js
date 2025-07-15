'kiwi public';

import _ from 'lodash';
import Vue from 'vue';

import Logger from '@/libs/Logger';

const log = Logger.namespace('ThemeManager');

let createdInstance = null;

export default class ThemeManager {
    constructor(state, argTheme) {
        this.state = state;

        this.activeTheme = null;
        this.previousTheme = null;

        this.varsElement = null;
        this.currentElement = null;
        this.loadingElement = null;

        Vue.observable(this);

        const initialTheme = this.findTheme(argTheme)
            || this.findTheme(state.setting('theme'))
            || this.availableThemes()[0];

        this.setTheme(initialTheme);
    }

    static themeUrl(theme) {
        let [url, qs] = theme.url.split('?');
        if (url[url.length - 1] !== '/') {
            url += '/';
        }
        return url + 'theme.css' + (qs ? '?' + qs : '');
    }

    availableThemes() {
        return this.state.getSetting('settings.themes');
    }

    findTheme(name) {
        if (!name) {
            return null;
        }
        return _.find(this.availableThemes(), (t) => t.name.toLowerCase() === name.toLowerCase());
    }

    currentTheme() {
        const theme = this.activeTheme || this.availableThemes()[0];
        return this.findTheme(theme.name);
    }

    setTheme(theme) {
        const nextTheme = Object.assign(
            Object.create(null),
            (typeof theme === 'string')
                ? this.findTheme(theme)
                : theme,
        );

        if (!nextTheme || !nextTheme.url) {
            // Tried to set an invalid theme, abort
            // reset the theme setting name to current if its not valid
            if (this.activeTheme.name !== this.state.setting('theme')) {
                this.state.setting('theme', this.activeTheme.name);
            }
            log.error('Invalid theme', nextTheme);
            return;
        }

        if (this.loadingElement) {
            // There is already a loading theme
            // remove it as we are about to load another
            document.head.removeChild(this.loadingElement);
            this.loadingElement = null;
        }

        if (this.activeTheme && this.activeTheme.url === nextTheme.url) {
            // Theme did not change, abort
            return;
        }

        const nextNameLower = nextTheme.name.toLowerCase();
        const themeElement = document.createElement('link');

        if (this.previousTheme) {
            // If previousTheme is not set then this is the initial theme
            // do not check its loading/error state so there is always an
            // active and previous theme set
            themeElement.onload = () => {
                // New theme loaded successfully
                this.previousTheme = this.activeTheme;
                this.activeTheme = nextTheme;

                if (this.currentElement) {
                    // Remove the old theme from the DOM
                    document.head.removeChild(this.currentElement);
                }

                // Move our loaded element into current position
                this.currentElement = this.loadingElement;
                this.loadingElement = null;

                if (nextTheme.name !== this.state.setting('theme')) {
                    // Reset the theme setting name to current if its not valid
                    this.state.setting('theme', nextTheme.name);
                }

                this.state.$emit('theme.change', nextTheme, this.previousTheme);
            };

            themeElement.onerror = () => {
                // New theme failed to load, remove its loading element
                document.head.removeChild(this.loadingElement);
                this.loadingElement = null;

                if (nextNameLower === 'custom' && !/\/theme\.css(\?|$)/.test(nextTheme.url)) {
                    // For custom themes try appending /theme.css
                    this.setCustomThemeUrl(ThemeManager.themeUrl(nextTheme));
                    return;
                }

                this.state.$emit('theme.failed', nextTheme, this.activeTheme);
            };

            this.loadingElement = themeElement;
        } else {
            // This is our initial theme set by url param or config
            this.activeTheme = nextTheme;
            this.previousTheme = nextTheme;
            this.currentElement = themeElement;
        }

        themeElement.rel = 'stylesheet';
        themeElement.type = 'text/css';
        themeElement.href = (nextNameLower !== 'custom')
            ? ThemeManager.themeUrl(nextTheme)
            : nextTheme.url;
        document.head.appendChild(themeElement);
    }

    setCustomThemeUrl(url) {
        const theme = this.findTheme('custom');
        if (!theme) {
            return;
        }

        theme.url = url;
        this.setTheme(theme);
    }

    reload() {
        const theme = this.currentTheme();
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
        this.setTheme(theme.name);
    }

    themeVar(varName) {
        if (!this.varsElement) {
            this.varsElement = document.querySelector('.kiwi-wrap');
        }

        const styles = window.getComputedStyle(this.varsElement);
        const value = styles.getPropertyValue('--kiwi-' + varName);
        return (value || '').trim();
    }
}

ThemeManager.instance = (...args) => {
    if (!createdInstance) {
        createdInstance = new ThemeManager(...args);
    }

    return createdInstance;
};
