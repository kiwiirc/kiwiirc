'kiwi public';

/** @module */

import * as Misc from '@/helpers/Misc';

/**
 * Adds the CHATHISTORY IRCv3 spec to irc-framework
 */
export default function chathistoryMiddleware() {
    return function middleware(client, rawEvents, parsedEvents) {
        client.requestCap('draft/chathistory');
        addFunctionsToClient(client);
        parsedEvents.use(theMiddleware);
    };

    function theMiddleware(command, event, client, next) {
        if (command.toLowerCase() === 'batch end chathistory' && client.chathistory) {
            let target = event.params[0];
            client.chathistory.batchCallbacks.resolve(target, event);
        }

        // This is sent as 'unknown command', its been structured this way so hopefully it
        // will still work if a fail handler is ever created in irc-fw
        if (event?.command?.toLowerCase() === 'fail' && event.params[0].toLowerCase() === 'chathistory') {
            client.chathistory.batchCallbacks.resolve(event.params[3]);

            if (event.params[1].toLowerCase() === 'invalid_target') {
                // suppress invalid target errors
                return;
            }
        }

        next();
    }
}

function addFunctionsToClient(client) {
    let history = client.chathistory = {};

    history.batchCallbacks = {
        callbacks: Object.create(null),
        add(target, cb) {
            this.callbacks[target.toLowerCase()] = this.callbacks[target.toLowerCase()] || [];
            this.callbacks[target.toLowerCase()].push(cb);
        },
        resolve(target, value) {
            let cbs = this.callbacks[target.toLowerCase()] || [];
            delete this.callbacks[target.toLowerCase()];
            cbs.forEach((cb) => cb(value));
        },
        targetCallbacks(target) {
            return this.callbacks[target.toLowerCase()];
        },
    };

    // supports (ISUPPORT) is used by kiwibnc, the spec and unreal's implementation uses CAP
    history.isSupported = () => !!client.network.supports('draft/chathistory') || client.network.cap.isEnabled('draft/chathistory');

    history.before = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        client.raw('CHATHISTORY', 'BEFORE', target, messageReference(dateOrTime), '50');
        history.batchCallbacks.add(target, resolve);
    });

    history.after = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        client.raw('CHATHISTORY', 'AFTER', target, messageReference(dateOrTime), '50');
        history.batchCallbacks.add(target, resolve);
    });

    history.latest = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        client.raw('CHATHISTORY', 'LATEST', target, messageReference(dateOrTime), '50');
        history.batchCallbacks.add(target, resolve);
    });

    history.around = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        client.raw('CHATHISTORY', 'AROUND', target, messageReference(dateOrTime), '50');
        history.batchCallbacks.add(target, resolve);
    });

    history.between = (target, fromDateOrTime, toDateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        let fromRef = messageReference(fromDateOrTime);
        let toRef = messageReference(toDateOrTime);
        client.raw('CHATHISTORY', 'BETWEEN', target, fromRef, toRef, 50);
        history.batchCallbacks.add(target, resolve);
    });

    function messageReference(inp) {
        if (typeof inp === 'object') {
            return 'timestamp=' + Misc.dateIso(inp);
        }

        if (inp === '*') {
            return '*';
        }

        return 'msgid=' + inp;
    }
}
