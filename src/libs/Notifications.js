import _ from 'lodash';

let isEnabled = false;

export function requestPermission() {
    // Do we support notifications?
    if (!('Notification' in window)) {
        isEnabled = false;
        return;
    }

    // Permissions already been granted?
    if (Notification.permission === 'granted') {
        isEnabled = true;
    }

    if (Notification.permission !== 'denied') {
        Notification.requestPermission((permission) => {
            if (permission === 'granted') {
                isEnabled = true;
            } else {
                isEnabled = false;
            }
        });
    }
}

export function show(title, body, opts) {
    if (!isEnabled) {
        return false;
    }

    let notify = new Notification(title, {
        body: body,
        icon: opts.icon,
    });

    if (opts.ttl) {
        setTimeout(notify.close.bind(notify), opts.ttl);
    }

    return notify;
}

const throttledShow = _.throttle(show, 2000);

export function listenForNewMessages(state) {
    state.$on('notification.show', (message, _opts) => {
        if (!isEnabled) {
            return;
        }

        let opts = Object.assign({
            title: 'Kiwi IRC',
            message: message,
            icon: '',
            onclick: null,
            ttl: 10000,
        }, _opts);

        if (!opts.message) {
            return;
        }

        let notification = throttledShow(opts.title, opts.message, {
            ttl: opts.ttl,
        });

        if (notification && typeof opts.onclick === 'function') {
            notification.onclick = opts.onclick;
        }
    });
}
