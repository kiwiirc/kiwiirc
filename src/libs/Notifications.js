import _ from 'lodash';
import * as Misc from 'src/helpers/Misc';

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

const throttledShow = _.throttle(show, 2000);


export function listenForNewMessages(state) {
    state.$on('message.new', (message, buffer) => {
        if (!isEnabled) {
            return;
        }

        let network = state.getNetwork(buffer.networkid);
        let isHighlight = Misc.mentionsNick(message.message, network.nick);
        let settingAlertOn = buffer.setting('alert_on');
        let notification = null;
        let notifyMessage = message.nick ?
                message.nick + ': ' :
                '';
        notifyMessage += message.message;

        // Ignore our own join/parts
        if (message.type === 'traffic' && message.nick === network.nick) {
            return;
        }

        if ((settingAlertOn === 'message' || settingAlertOn === 'highlight') && isHighlight) {
            notification = throttledShow('You were mentioned in ' + buffer.name, notifyMessage, {
                ttl: 10000,
            });
        } else if (settingAlertOn === 'message' && !isHighlight) {
            notification = throttledShow(buffer.name, notifyMessage, {
                ttl: 10000,
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
