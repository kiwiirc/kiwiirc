let isEnabled = false;

export function requestPermission() {
    // Do we support notifications?
    if (!('Notification' in window)) {
        isEnabled = false;
    }

    // Permissions already been granted?
    if (Notification.permission === 'granted') {
        console.log('notifications already granted');
        isEnabled = true;
    }

    if (Notification.permission !== 'denied') {
        Notification.requestPermission(permission => {
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


export function listenForNewMessages(state) {
    state.$on('message.new', (message, buffer) => {
        if (!isEnabled) {
            return;
        }

        let network = state.getNetwork(buffer.networkid);
        let isHighlight = message.message.indexOf(network.nick) > -1;
        let settingAlertOn = buffer.setting('alert_on');
        let notification = null;
        let notifyMessage = message.nick ?
                message.nick + ': ' :
                '';
        notifyMessage += message.message;

        if ((settingAlertOn === 'message' || settingAlertOn === 'highlight') && isHighlight) {
            notification = show('You were mentioned in ' + buffer.name, notifyMessage, {
                ttl: 7000,
            });
        } else if (settingAlertOn === 'message' && !isHighlight) {
            notification = show(buffer.name, notifyMessage, {
                ttl: 7000,
            });
        } else if (settingAlertOn === 'never') {
            // Don't do anything
        }

        if (notification) {
            notification.onclick = () => {
                state.setActiveBuffer(buffer.networkid, buffer.name);
            };
        }
    });
}
