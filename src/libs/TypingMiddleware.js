'kiwi public';

/** @module */

/**
 * Adds the +typing IRCv3 spec to irc-framework
 */
export default function typingMiddleware() {
    return function middleware(client, rawEvents, parsedEvents) {
        addFunctionsToClient(client);
        rawEvents.use(theMiddleware);
    };

    function theMiddleware(command, message, rawLine, client, next) {
        if (
            !(command === 'TAGMSG' && message.tags['+typing']) &&
            !(command === 'PRIVMSG' && message.nick)
        ) {
            next();
            return;
        }

        // if we are params[0] then the target is the sender (direct message)
        let target = (message.params[0].toLowerCase() === client.user.nick.toLowerCase()) ?
            message.nick :
            message.params[0];

        // if its a privmsg without typing tag emit done
        let status = message.tags['+typing'] || 'done';

        client.emit('typing', {
            target: target,
            nick: message.nick,
            ident: message.ident,
            hostname: message.hostname,
            status: status,
        });

        next();
    }
}

function addFunctionsToClient(client) {
    let typing = client.typing = {};
    let activeTyping = Object.create(null);

    function isEnabled() {
        return client.network.cap.isEnabled('message-tags');
    }

    typing.start = function start(target) {
        if (!isEnabled()) {
            return;
        }

        let lastSentStatus = activeTyping[target.toLowerCase()];
        if (lastSentStatus && lastSentStatus > Date.now() - 3000) {
            return;
        }

        activeTyping[target.toLowerCase()] = Date.now();

        let message = new client.Message('TAGMSG', target);
        message.tags['+typing'] = 'active';
        client.raw(message);
    };

    typing.pause = function pause(target) {
        if (!isEnabled()) {
            return;
        }

        if (!activeTyping[target.toLowerCase()]) {
            // Did not start typing so cannot pause
            return;
        }

        let message = new client.Message('TAGMSG', target);
        message.tags['+typing'] = 'paused';
        client.raw(message);
    };

    typing.stop = function stop(target, sendStop) {
        if (!isEnabled()) {
            return;
        }

        if (!activeTyping[target.toLowerCase()]) {
            // Did not start typing so cannot stop
            return;
        }

        delete activeTyping[target.toLowerCase()];

        if (!sendStop) {
            // Stop was called after a message was sent,
            // only a cleanup of activeTyping is needed
            return;
        }

        let message = new client.Message('TAGMSG', target);
        message.tags['+typing'] = 'done';
        client.raw(message);
    };
}
