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
        if (command === 'batch end' && client.chathistory) {
            if (event.type === 'chathistory') {
                let target = event.params[0];
                client.chathistory.batchCallbacks.resolve(target, event);
            } else if (event.type === 'draft/chathistory-targets') {
                if (client.chathistory.pendingTargets) {
                    let resolve = client.chathistory.pendingTargets;
                    client.chathistory.pendingTargets = null;
                    resolve(event);
                }
            }
        }

        // This is sent as 'unknown command', its been structured this way so hopefully it
        // will still work if a fail handler is ever created in irc-fw
        if (event?.command?.toLowerCase() === 'fail' && event.params[0].toLowerCase() === 'chathistory') {
            // If this FAIL is for a TARGETS request, resolve the pending targets promise
            if (client.chathistory.pendingTargets && event.params[2]?.toUpperCase() === 'TARGETS') {
                let resolve = client.chathistory.pendingTargets;
                client.chathistory.pendingTargets = null;
                resolve(null);
                return;
            }

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

    // Resolve function for a pending CHATHISTORY TARGETS request, or null if none is in flight.
    history.pendingTargets = null;

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

    /**
     * Send CHATHISTORY TARGETS to discover conversations (DMs or channels) that had
     * activity between now and afterTimestamp (an ISO 8601 string). Returns a promise
     * that resolves to an array of { name, latestMessage } objects, or [] on error.
     */
    history.targets = (afterTimestamp) => {
        if (!history.isSupported()) {
            return Promise.resolve([]);
        }

        return new Promise((resolve) => {
            let timeoutId;

            history.pendingTargets = (event) => {
                clearTimeout(timeoutId);
                history.pendingTargets = null;
                if (!event) {
                    resolve([]);
                    return;
                }
                let targets = (event.commands || [])
                    .filter((msg) => msg.command === 'CHATHISTORY' && msg.params[0] === 'TARGETS')
                    .map((msg) => ({ name: msg.params[1], latestMessage: msg.params[2] }));
                resolve(targets);
            };

            let now = 'timestamp=' + Misc.dateIso(new Date());
            client.raw('CHATHISTORY', 'TARGETS', now, 'timestamp=' + afterTimestamp, '1000');

            // Resolve with an empty array if the server does not respond within 10 seconds
            timeoutId = setTimeout(() => {
                if (history.pendingTargets) {
                    log.warn('chathistory targets request timed out');
                    history.pendingTargets = null;
                    resolve([]);
                }
            }, 10000);
        });
    };

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
