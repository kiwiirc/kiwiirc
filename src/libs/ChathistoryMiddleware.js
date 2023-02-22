'kiwi public';

/** @module */

import Logger from '@/libs/Logger';
import * as Misc from '@/helpers/Misc';

const log = Logger.namespace('chathistory');

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
    const history = client.chathistory = {};

    history.batchCallbacks = {
        callbacks: Object.create(null),
        queue: [],
        queueActive: false,
        add(cb, target, type, ...args) {
            this.callbacks[target.toUpperCase()] = this.callbacks[target.toUpperCase()] || [];
            this.callbacks[target.toUpperCase()].push(cb);
            this.queue.push({
                target,
                type,
                args,
            });
            if (!this.queueActive) {
                this.queueNext();
            }
        },
        resolve(target, value) {
            const targetCallbacks = this.callbacks[target.toUpperCase()] || [];
            const cb = targetCallbacks.shift();

            if (!targetCallbacks.length) {
                // last callback, cleanup callbacks
                delete this.callbacks[target.toUpperCase()];
            }

            if (cb) {
                cb(value);
            } else if (history.isSupported()) {
                // inspircd currently does not support chathistory
                // but sends chathistory batches when joining channels
                log.error('chathistory got a resolve but no associated callback');
            }

            this.queueNext();
        },
        queueNext() {
            this.queueActive = true;

            const nextRequest = this.queue.shift();
            if (!nextRequest) {
                this.queueActive = false;
                return;
            }

            client.raw('CHATHISTORY', nextRequest.type, nextRequest.target, ...nextRequest.args);
        },
    };

    // supports (ISUPPORT) is used by kiwibnc, the spec and unreal's implementation uses CAP
    history.isSupported = () => !!client.network.supports('draft/chathistory') || client.network.cap.isEnabled('draft/chathistory');

    history.before = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        history.batchCallbacks.add(resolve, target, 'BEFORE', messageReference(dateOrTime), '50');
    });

    history.after = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        history.batchCallbacks.add(resolve, target, 'AFTER', messageReference(dateOrTime), '50');
    });

    history.latest = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        history.batchCallbacks.add(resolve, target, 'LATEST', messageReference(dateOrTime), '50');
    });

    history.around = (target, dateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        history.batchCallbacks.add(resolve, target, 'AROUND', messageReference(dateOrTime), '50');
    });

    history.between = (target, fromDateOrTime, toDateOrTime) => new Promise((resolve) => {
        if (!history.isSupported()) {
            resolve();
            return;
        }

        const fromRef = messageReference(fromDateOrTime);
        const toRef = messageReference(toDateOrTime);
        history.batchCallbacks.add(resolve, target, 'BETWEEN', fromRef, toRef, 50);
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
