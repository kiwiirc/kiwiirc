export default class WindowTitle {
    constructor(state) {
        this.state = state;
        this.title = state.settings.windowTitle || '';
        this.alert = false;

        // Update the window title if we have one
        if (state.settings.windowTitle) {
            this.updateTitle();
        }

        state.$watch('settings.windowTitle', (newVal) => {
            this.updateTitle(newVal);
        });

        state.$watch('ui.app_has_focus', (newVal) => {
            if (newVal && this.alertTmr) {
                this.stopAlert();
            }
        });

        state.$on('notification.title', (enable) => {
            if (enable) {
                this.startAlert();
            } else {
                this.stopAlert();
            }
        });
    }

    startAlert() {
        if (this.alertTmr) {
            return;
        }

        this.alertTmr = setInterval(() => {
            this.updateTitle();
        }, 1000);
    }

    stopAlert() {
        if (this.alertTmr) {
            clearInterval(this.alertTmr);
            this.alertTmr = null;
        }

        this.updateTitle();
    }

    updateTitle(newTitle) {
        if (typeof newTitle === 'string') {
            this.title = newTitle;
        }

        if (this.alertTmr && !this.alert) {
            window.document.title = '* ' + this.title;
            this.alert = true;
        } else {
            window.document.title = this.title;
            this.alert = false;
        }
    }
}
