'kiwi public';

import _ from 'lodash';
import strftime from 'strftime';
import Irc from 'irc-framework';
import * as TextFormatting from '@/helpers/TextFormatting';
import typingMiddleware from './TypingMiddleware';
import chathistoryMiddleware from './ChathistoryMiddleware';
import * as ServerConnection from './ServerConnection';

export function create(state, network) {
    let networkid = network.id;

    let ircClient = new Irc.Client({
        // Most options are set under the overloaded .connect()
        version: null,
        enable_chghost: true,
        enable_setname: true,
        message_max_length: 350,
    });
    ircClient.requestCap('znc.in/self-message');
    ircClient.use(chathistoryMiddleware());
    ircClient.use(clientMiddleware(state, network));
    ircClient.use(typingMiddleware());

    // Overload the connect() function to make sure we are connecting with the
    // most recent connection details from the network state
    let originalIrcClientConnect = ircClient.connect;
    ircClient.connect = function connect(...args) {
        // Set some defaults if we don't have eveything
        if (!network.connection.nick) {
            network.connection.nick = 'Guest' + Math.floor(Math.random() * 100);
        }

        ircClient.options.host = network.connection.server;
        ircClient.options.port = network.connection.port;
        ircClient.options.tls = network.connection.tls;
        ircClient.options.path = network.connection.path;
        ircClient.options.password = network.connection.password;
        if (network.password) {
            ircClient.options.account = {
                account: network.connection.nick,
                password: network.password,
            };
        } else {
            // No password so give an empty account config. This forces irc-framework to keep
            // the server password (options.password) separate from SASL
            ircClient.options.account = { };
        }
        ircClient.options.nick = network.connection.nick;
        ircClient.options.username = network.username || network.connection.nick;
        ircClient.options.gecos = network.gecos || 'https://kiwiirc.com/';
        ircClient.options.encoding = network.connection.encoding;
        ircClient.options.auto_reconnect = !!state.setting('autoReconnect');
        ircClient.options.sasl_disconnect_on_fail = !!state.setting('disconnectOnSaslFail');

        // Apply any irc-fw options specified in kiwiirc config
        let configOptions = state.setting('ircFramework');
        if (configOptions) {
            Object.assign(ircClient.options, configOptions);
        }

        let eventObj = { network, transport: null };
        state.$emit('network.connecting', eventObj);

        if (eventObj.transport) {
            // A plugin might use its own transport of some kind
            ircClient.options.transport = eventObj.transport;
        } else if (!network.connection.direct) {
            // A direct connection uses a websocket to connect (note: some browsers limit
            // the number of connections to the same host!).
            // A non-direct connection will connect via the configured kiwi server using
            // with our own irc-framework compatible transport.
            ircClient.options.transport = ServerConnection.createChannelConstructor(
                state.settings.kiwiServer,
                (window.location.hash || '').substr(1),
                networkid
            );
        } else {
            // Use the irc-framework default transport
            ircClient.options.transport = undefined;
        }

        originalIrcClientConnect.apply(ircClient, args);
    };

    // Overload the raw() function so that we can emit outgoing IRC messages to plugins
    let originalIrcClientRaw = ircClient.raw;
    ircClient.raw = function raw(...args) {
        let message = null;

        if (args[0] instanceof Irc.Message) {
            message = args[0];
        } else {
            let rawString = ircClient.rawString(...args);
            message = Irc.ircLineParser(rawString);
        }

        let eventObj = { network, message, handled: false };
        state.$emit('ircout', eventObj);
        if (eventObj.handled) {
            return;
        }

        // Workaround for unsetting the topic as to1459() will remove the trailing colon.
        const isTopic = (
            args.length === 1
            && typeof args[0] === 'string'
            && args[0].indexOf('TOPIC') === 0
        );
        if (isTopic && args[0].lastIndexOf(':') === args[0].length - 1) {
            originalIrcClientRaw.apply(ircClient, args);
            return;
        }

        originalIrcClientRaw.apply(ircClient, [message]);
    };

    ircClient.on('raw', (event) => {
        if (!network.setting('show_raw') && !state.setting('showRaw')) {
            return;
        }

        let buffer = state.getOrAddBufferByName(networkid, '*raw');
        state.addMessage(buffer, {
            time: Date.now(),
            nick: '',
            message: (event.from_server ? '[S] ' : '[C] ') + event.line,
        });
    });

    ircClient.on('typing', (event) => {
        let user = state.getUser(network.id, event.nick);
        if (user) {
            user.typingStatus(event.target, event.status);
        }
    });

    return ircClient;
}

function clientMiddleware(state, network) {
    let networkid = network.id;
    // eslint-disable-next-line
    let numConnects = 0;
    let isRegistered = false;

    return function middlewareFn(client, rawEvents, parsedEvents) {
        parsedEvents.use(parsedEventsHandler);
        rawEvents.use(rawEventsHandler);

        client.on('connecting', () => {
            network.state_error = '';
            network.state = 'connecting';
            network.last_error = '';
            network.last_error_numeric = 0;
        });

        client.on('connected', () => {
            network.state_error = '';
            network.state = 'connected';

            let currentUser = network.currentUser();
            if (currentUser) {
                currentUser.away = '';
            }
        });

        client.on('socket close', (err) => {
            isRegistered = false;
            network.state = 'disconnected';

            if (err) {
                network.state_error = (typeof err === 'string') ? err : 'err_unknown';
            }

            let currentUser = network.currentUser();
            if (currentUser) {
                currentUser.away = 'offline';
            }

            network.buffers.forEach((buffer) => {
                if (!buffer) {
                    return;
                }

                buffer.joined = false;
                buffer.clearUsers();
            });
        });
    };

    function rawEventsHandler(command, event, rawLine, client, next) {
        // Allow plugins to override raw IRC events
        let eventObj = { ...event, raw: rawLine, handled: false };
        state.$emit('irc.raw', command, eventObj, network);
        if (eventObj.handled) {
            return;
        }

        state.$emit('irc.raw.' + command, command, eventObj, network);
        if (eventObj.handled) {
            return;
        }

        if (command === '002') {
            // Your host is server.example.net, running version InspIRCd-2.0
            let param = event.params[1] || '';
            let m = param.match(/running version (.*)$/);
            network.ircd = m ?
                m[1] :
                '';
        }

        if (command === 'CAP' && network.setting('show_raw_caps')) {
            let params = [...event.params];
            if (params[params.length - 1].indexOf(' ') > -1) {
                params[params.length - 1] = ':' + params[params.length - 1];
            }

            let buffer = network.serverBuffer();
            state.addMessage(buffer, {
                time: Date.now(),
                nick: '',
                message: event.command + ' ' + params.join(' '),
            });
        }

        next();
    }

    function parsedEventsHandler(command, event, client, next) {
        // Trigger this event through the state object first. If it's been handled
        // somewhere else then we ignore it.
        let ircEventObj = { handled: false };
        state.$emit('irc.' + command, event, network, ircEventObj);
        if (ircEventObj.handled) {
            next();
            return;
        }

        // Ignore any of the control messages. They're transport related to kiwi internals
        if (event && event.command === 'CONTROL') {
            next();
            return;
        }

        // If there is a time difference between this client and the server, convert it
        // to match our local time so it makes sense to the user
        let eventTime = (event && event.time) ?
            network.ircClient.network.timeToLocal(event.time) :
            Date.now();
        let serverTime = (event && event.time) || 0;

        if (command === 'channel_redirect') {
            let b = network.bufferByName(event.from);
            if (b) {
                b.flags.redirect_to = event.to;
            }
        }

        if (command === 'registered') {
            isRegistered = true;
            network.nick = event.nick;
            state.addUser(networkid, { nick: event.nick, username: client.user.username });

            let serverBuffer = network.serverBuffer();
            state.addMessage(serverBuffer, {
                time: eventTime,
                server_time: serverTime,
                nick: '',
                message: TextFormatting.t('connected_to', { network: client.network.name }),
            });

            // Get some extra info about ourselves
            client.raw('WHO ' + event.nick);

            if (network.auto_commands) {
                network.auto_commands.split('\n').forEach((line) => {
                    state.$emit('input.raw', line[0] === '/' ? line : `/${line}`, {
                        network: network,
                        buffer: serverBuffer,
                    });
                });
            }

            // Join our channels
            // If under bouncer mode, the bouncer will send the channels were joined to instead.
            if (!network.connection.bncnetid) {
                network.buffers.forEach((buffer) => {
                    if (buffer.isChannel() && buffer.enabled) {
                        client.join(buffer.name, buffer.key);
                    }
                });
            }

            numConnects++;
        }

        if (command === 'server options') {
            // If the network name has changed from the irc-framework default, update ours
            // Also if it isn't a BNC network as the name is then derived from the BNC info instead
            if (client.network.name !== 'Network' && !network.connection.bncnetid) {
                network.name = client.network.name;
            }
        }

        // Show unhandled data from the server in the servers tab
        if (command === 'unknown command') {
            let buffer = network.serverBuffer();
            let containsNick = event.params[0] === network.ircClient.user.nick;
            let isChannelMessage = network.isChannelName(event.params[1]);

            let message = '';
            if (['486', '477'].includes(event.command)) {
                // Messages from these events don't need the nick from params[0]
                message = event.params[2];
            } else if (containsNick && isChannelMessage) {
                // This error is aimed at us and has a target channel
                // replace the target buffer and remove unneeded params
                let channelBuffer = network.bufferByName(event.params[1]);
                if (channelBuffer) {
                    buffer = channelBuffer;
                }
                message = event.params.slice(2).join(', ');
            } else if (containsNick) {
                // Strip out our nick if it's the first params (many commands include this)
                message = event.params.slice(1).join(', ');
            } else {
                message = event.params.join(', ');
            }

            // Numerics for restrictions on sending messages to channels/users
            const restrictedMessages = [
                '486', // ERR_NONONREG old numeric used by unreal42
                '477', // ERR_NEEDREGGEDNICK
                '716', // RPL_TARGUMODEG
                '717', // RPL_TARGNOTIFY
            ];
            if (restrictedMessages.includes(event.command)) {
                // You must log in with services to message this user/channel
                // or CallerID +g
                buffer = state.getOrAddBufferByName(network.id, event.params[1]);

                // Only add this message if it does not match the previous message
                // Typing status messages can cause a spam of this error type
                state.addMessageNoRepeat(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '*',
                    message: message,
                    type: 'error',
                });

                if (
                    event.command === '477' &&
                    buffer.isChannel() &&
                    buffer.enabled &&
                    !buffer.joined
                ) {
                    // The buffer we tried to join requires a registered nick,
                    // disable it until the user manually tries to rejoin
                    buffer.enabled = false;
                }
            } else {
                // Only show non-numeric commands
                if (!event.command.match(/^\d+$/)) {
                    message += event.command + ' ';
                }

                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '',
                    message: message,
                });
            }
        }

        if (command.toLowerCase() === 'batch start chathistory' && client.chathistory) {
            // We have a new batch of messages. To prevent duplicate messages being shown, we remove
            // all messages we have locally in the range of these new messages so that the new block
            // of messages we recieved are displayed accurately. Each message in the block will
            // trigger a 'message' event after this.
            let startTime = 0;
            let endTime = 0;
            event.commands.forEach((message) => {
                if (message.time && message.time > endTime) {
                    endTime = message.time;
                }

                if (message.time && message.time < startTime) {
                    startTime = message.time;
                }
            });

            if (!startTime || !endTime) {
                return;
            }

            let buffer = state.getBufferByName(networkid, event.params[0]);
            if (buffer) {
                buffer.clearMessageRange(startTime, endTime);
            }
        }

        if (command === 'message') {
            let isPrivateMessage = false;
            let bufferName = event.from_server ? '*' : event.target;

            // If the message came from a batch then params[0] is the bufferName
            if (event.batch && event.batch.type === 'chathistory' && event.batch.params[0]) {
                bufferName = event.batch.params[0];
                isPrivateMessage = !network.isChannelName(bufferName);
            } else if (!event.from_server && event.target === client.user.nick) {
                // PMs should go to a buffer with the name of the other user
                isPrivateMessage = true;
                bufferName = event.nick;
            }

            // Chanserv sometimes PMs messages about a channel on join in the format of
            // [#channel] welcome!
            // Redirect these to #channel
            if (
                event.nick.toLowerCase() === 'chanserv' &&
                isPrivateMessage &&
                event.message[0] === '['
            ) {
                bufferName = event.message.substr(1, event.message.indexOf(']') - 1);
            }

            // Notices from somewhere when we don't have an existing buffer for them should go into
            // the server tab. ie. notices from servers
            if (event.type === 'notice') {
                let existingBuffer = state.getBufferByName(networkid, bufferName);
                let noticeActiveBuffer = state.setting('noticeActiveBuffer');
                let activeBuffer = state.getActiveBuffer();
                let hasActiveBuffer = activeBuffer && activeBuffer.networkid === networkid;

                // If we don't have a buffer for this notice sender, either show it in our active
                // buffer or the server buffer
                if (!existingBuffer) {
                    if (noticeActiveBuffer && hasActiveBuffer && !activeBuffer.isSpecial()) {
                        bufferName = activeBuffer.name;
                    } else {
                        bufferName = '*';
                    }
                }
            }

            const PM_BLOCK_BLOCKED = false;
            // const PM_BLOCK_NOT_BLOCKED = true;
            const PM_BLOCK_REQUIRES_CHECK = null;

            let pmBlock = network.isNickExemptFromPmBlocks(event.nick);
            let blockNewPms = state.setting('buffers.block_pms');
            let buffer = state.getBufferByName(networkid, bufferName);

            let textFormatType = 'privmsg';
            if (event.type === 'action') {
                textFormatType = 'action';
            } else if (event.type === 'notice') {
                textFormatType = 'notice';
            }

            let messageBody = TextFormatting.formatText(textFormatType, {
                nick: event.nick,
                username: event.ident,
                host: event.hostname,
                text: event.message,
            });

            let message = {
                time: eventTime,
                server_time: serverTime,
                nick: event.nick,
                message: messageBody,
                type: event.type,
                tags: event.tags || {},
            };

            // If this is a new PM and the sending user is not exempt from blocks, ignore it
            if (blockNewPms && isPrivateMessage && !buffer && pmBlock === PM_BLOCK_BLOCKED) {
                return;
            }

            // If we need to manually check if this user is blocked..
            // PM_BLOCK_REQUIRES_CHECK means we should whois the user to get their oper status. We
            // allways allow messages from opers.
            if (blockNewPms && isPrivateMessage && !buffer && pmBlock === PM_BLOCK_REQUIRES_CHECK) {
                // if the nick is in pendingPms it has already issued a whois request
                let awaitingWhois = !!_.find(network.pendingPms, { nick: event.nick });
                network.pendingPms.push({ bufferName, message });

                // Don't send another whois if we are already awaiting another
                if (awaitingWhois) {
                    return;
                }

                network.ircClient.whois(event.nick, event.nick, (whoisData) => {
                    network.pendingPms.forEach((pm, idx, obj) => {
                        let nickLower = pm.message.nick.toLowerCase();
                        if (nickLower === whoisData.nick.toLowerCase()) {
                            if (whoisData.operator) {
                                buffer = state.getOrAddBufferByName(network.id, pm.bufferName);
                                state.addMessage(buffer, pm.message);
                            }
                            obj.splice(idx, 1);
                        }
                    });
                });

                return;
            }

            // Make sure we have a buffer for our message
            if (!buffer) {
                buffer = state.getOrAddBufferByName(networkid, bufferName);
            }
            state.addMessage(buffer, message);
        }

        if (command === 'wallops') {
            let buffer = state.getOrAddBufferByName(networkid, '*');
            let messageBody = TextFormatting.formatText('wallops', {
                text: event.message,
            });

            state.addMessage(buffer, {
                time: eventTime,
                server_time: serverTime,
                nick: event.nick,
                message: messageBody,
                type: 'wallops',
            });
        }

        if (command === 'join') {
            // If we have any buffers marked as being redirected to this new channel, update
            // that buffer instead of creating a new one
            if (event.nick === client.user.nick) {
                network.buffers.forEach((b) => {
                    if ((b.flags.redirect_to || '').toLowerCase() === event.channel.toLowerCase()) {
                        state.$delete(b.flags, 'redirect_to');
                        b.rename(event.channel);
                    }
                });
            }

            let buffer = state.getOrAddBufferByName(networkid, event.channel);

            // The case does not match, update buffer.name to the casing sent by the server
            if (buffer.name !== event.channel) {
                buffer.rename(event.channel);
            }

            state.addUserToBuffer(buffer, {
                nick: event.nick,
                username: event.ident,
                host: event.hostname,
                realname: event.gecos,
                account: event.account || '',
            });

            if (event.nick === client.user.nick) {
                buffer.enabled = true;
                buffer.joined = true;
                buffer.flags.channel_badkey = false;
                network.ircClient.raw('MODE', event.channel);
                network.ircClient.who(event.channel);
            }

            let ignoreEvent = state.setting('skipHiddenMessages') && !buffer.setting('show_joinparts');
            if (!ignoreEvent || event.nick === client.user.nick) {
                let nick = buffer.setting('show_hostnames') ?
                    TextFormatting.formatUserFull(event) :
                    TextFormatting.formatUser(event);

                let messageBody = TextFormatting.formatAndT(
                    'channel_join',
                    null,
                    'has_joined',
                    { nick: nick }
                );

                let typeExtra = (event.nick === client.user.nick) ? 'join_self' : 'join';

                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: event.nick,
                    message: messageBody,
                    type: 'traffic',
                    type_extra: typeExtra,
                });
            }
        }
        if (command === 'kick') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            state.removeUserFromBuffer(buffer, event.kicked);

            if (event.kicked === client.user.nick) {
                buffer.joined = false;
                buffer.enabled = false;
                buffer.clearUsers();
            }

            let messageBody = '';
            let ignoreEvent = state.setting('skipHiddenMessages') && !buffer.setting('show_joinparts');
            let isUserInvolved = [event.kicked, event.nick].includes(client.user.nick);
            if (!ignoreEvent || isUserInvolved) {
                if (event.kicked === client.user.nick) {
                    messageBody = TextFormatting.formatAndT(
                        'channel_selfkick',
                        { reason: event.message },
                        'kicked_you_from',
                        {
                            nick: TextFormatting.formatUser(event),
                            channel: event.channel,
                        }
                    );
                } else {
                    messageBody = TextFormatting.formatAndT(
                        'channel_kicked',
                        { reason: event.message },
                        'was_kicked_from',
                        {
                            nick: event.kicked,
                            channel: event.channel,
                            chanop: TextFormatting.formatUser(event.nick),
                        }
                    );
                }

                let typeExtra = (isUserInvolved) ? 'kick_self' : 'kick';

                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: event.nick,
                    message: messageBody,
                    type: 'traffic',
                    type_extra: typeExtra,
                });
            }
        }
        if (command === 'part') {
            let buffer = state.getBufferByName(networkid, event.channel);
            if (!buffer) {
                return;
            }

            state.removeUserFromBuffer(buffer, event.nick);
            if (event.nick === client.user.nick) {
                buffer.joined = false;
                buffer.enabled = false;
                buffer.clearUsers();
            }

            // Remove the user from network state if no remaining common channels
            let remainingBuffers = state.getBuffersWithUser(networkid, event.nick);
            if (remainingBuffers.length === 0) {
                state.removeUser(networkid, {
                    nick: event.nick,
                });
            }

            let ignoreEvent = state.setting('skipHiddenMessages') && !buffer.setting('show_joinparts');
            if (!ignoreEvent || event.nick === client.user.nick) {
                let nick = buffer.setting('show_hostnames') ?
                    TextFormatting.formatUserFull(event) :
                    TextFormatting.formatUser(event);

                let messageBody = TextFormatting.formatAndT(
                    'channel_part',
                    { reason: event.message },
                    'has_left',
                    { nick: nick },
                );

                let typeExtra = (event.nick === client.user.nick) ? 'part_self' : 'part';

                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: event.nick,
                    message: messageBody,
                    type: 'traffic',
                    type_extra: typeExtra,
                });
            }
        }
        if (command === 'quit') {
            let buffers = state.getBuffersWithUser(networkid, event.nick);

            buffers.forEach((buffer) => {
                if (!buffer) {
                    return;
                }

                if (event.nick === client.user.nick) {
                    buffer.joined = false;
                    buffer.clearUsers();
                }

                let ignoreEvent = state.setting('skipHiddenMessages') && !buffer.setting('show_joinparts');
                if (ignoreEvent && event.nick !== client.user.nick) {
                    return;
                }

                let nick = buffer.setting('show_hostnames') ?
                    TextFormatting.formatUserFull(event) :
                    TextFormatting.formatUser(event);

                let messageBody = TextFormatting.formatAndT(
                    'channel_quit',
                    { reason: event.message },
                    'has_left',
                    { nick: nick }
                );

                let typeExtra = (event.nick === client.user.nick) ? 'quit_self' : 'quit';

                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: event.nick,
                    message: messageBody,
                    type: 'traffic',
                    type_extra: typeExtra,
                });
            });

            // Set the user as away before removing so away status indicators are updated
            let user = state.getUser(networkid, event.nick);
            if (user) {
                user.away = 'offline';
            }

            state.removeUser(networkid, {
                nick: event.nick,
            });
        }

        if (command === 'invite') {
            let buffer = network.serverBuffer();
            let activeNetwork = state.getActiveNetwork();
            let activeBuffer = state.getActiveBuffer();
            if (network === activeNetwork && !activeBuffer.isSpecial()) {
                buffer = activeBuffer;
            }

            let translationKey = 'invited_other';
            if (event.invited === network.currentUser().nick) {
                translationKey = 'invited_you';
            } else if (event.nick === network.currentUser().nick) {
                translationKey = 'invited_inviter';
            }

            state.addMessage(buffer, {
                nick: '',
                time: eventTime,
                server_time: serverTime,
                type: 'invite',
                message: TextFormatting.t(translationKey, {
                    nick: event.nick,
                    invited: event.invited,
                    channel: event.channel,
                }),
            });
        }

        if (command === 'account') {
            state.addUser(networkid, { nick: event.nick, account: event.account || '' });
        }

        if (command === 'whois' && !event.error) {
            const userObj = {
                nick: event.nick,
                host: event.hostname,
                username: event.ident,
                realname: event.real_name,
            };

            // Whois items that maybe will exist
            ['away', 'account'].forEach((prop) => {
                if (typeof event[prop] !== 'undefined') {
                    userObj[prop] = event[prop] || '';
                }
            });

            const user = state.addUser(networkid, userObj);
            Object.keys(user.whois).forEach((prop) => (
                user.whois[prop] = event[prop] ?? ''
            ));

            user.hasWhois = true;
        }

        if (command === 'away') {
            state.addUser(networkid, {
                nick: event.nick,
                away: event.message || '',
            });
            let buffer = state.getActiveBuffer();
            if (buffer && event.nick === client.user.nick) {
                network.away = 'away';
                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '*',
                    type: 'presence',
                    message: event.message,
                });
            }
        }

        if (command === 'back') {
            state.addUser(networkid, {
                nick: event.nick,
                away: '',
            });
            let buffer = state.getActiveBuffer();
            if (buffer && event.nick === client.user.nick) {
                network.away = '';
                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '*',
                    type: 'presence',
                    message: event.message,
                });
            }
        }

        if (command === 'wholist') {
            state.usersTransaction(networkid, (users) => {
                event.users.forEach((eventUser) => {
                    let userObj = {
                        nick: eventUser.nick,
                        host: eventUser.hostname || undefined,
                        username: eventUser.ident || undefined,
                        away: eventUser.away ? 'Away' : '',
                        realname: eventUser.real_name,
                        account: eventUser.account || undefined,
                    };
                    let user = state.addUser(networkid, userObj, users);
                    if (!user) {
                        // Should never happen as this network should always exist
                        return;
                    }

                    let buffer = network.bufferByName(eventUser.channel);
                    if (!buffer || !user.buffers[buffer.id]) {
                        return;
                    }

                    // Add all the user channel modes
                    let modes = user.buffers[buffer.id].modes;
                    eventUser.channel_modes.forEach((mode) => {
                        if (modes.indexOf(mode) === -1) {
                            modes.push(mode);
                        }
                    });

                    Object.keys(user.whoFlags).forEach((flag) => {
                        if (typeof eventUser[flag] === 'boolean') {
                            user.whoFlags[flag] = eventUser[flag];
                        }
                    });
                    user.hasWhoFlags = true;
                });
            });
        }

        if (command === 'channel list start') {
            network.channel_list_cache = [];
            network.channel_list_state = 'updating';
        }
        if (command === 'channel list') {
            network.channel_list_state = 'updating';
            // Filter private channels from the channel list
            let filteredEvent = _.filter(event, (o) => o.channel !== '*');
            // Store the channels in channel_list_cache before moving it all to
            // channel_list at the end. This gives a huge performance boost since
            // it doesn't need to be all reactive for every update
            network.channel_list_cache = (network.channel_list_cache || []).concat(filteredEvent);
        }
        if (command === 'channel list end') {
            network.channel_list = network.channel_list_cache || [];
            network.channel_list_state = 'updated';
            delete network.channel_list_cache;
        }

        if (command === 'motd') {
            let buffer = network.serverBuffer();
            let messageBody = TextFormatting.formatText('motd', {
                text: event.motd,
            });
            state.addMessage(buffer, {
                time: eventTime,
                server_time: serverTime,
                nick: '',
                message: messageBody,
                type: 'motd',
            });
        }

        if (command === 'nick in use') {
            let shouldChangeNick = !client.connection.registered && state.setting('changeNickOnCollision');
            let newNick = client.user.nick.replace(/\d+$/, '') + rand(1, 99);

            let translationKey = shouldChangeNick ? 'nick_in_use_retrying' : 'error_nick_in_use';
            let translationVars = { nick: client.user.nick };
            if (shouldChangeNick) {
                translationVars.newnick = newNick;
            }

            let messageBody = TextFormatting.formatAndT(
                'nickname_alreadyinuse',
                null,
                translationKey,
                translationVars,
            );

            let message = {
                time: eventTime,
                server_time: serverTime,
                nick: '',
                message: messageBody,
                type: 'error',
            };

            let activeBuffer = state.getActiveBuffer();
            let buffer = network.serverBuffer();

            if (activeBuffer && activeBuffer.networkid === network.id) {
                buffer = activeBuffer;
            }
            if (buffer) {
                state.addMessage(buffer, message);
            }

            if (shouldChangeNick) {
                client.changeNick(newNick);
            } else if (!client.connection.registered) {
                network.last_error = messageBody;
                network.ircClient.connection.end();
            }
        }

        if (command === 'nick') {
            if (event.nick === client.user.nick) {
                network.nick = event.new_nick;
            }

            state.changeUserNick(networkid, event.nick, event.new_nick);

            let messageBody = TextFormatting.formatAndT(
                'nick_changed',
                null,
                'now_known_as',
                { nick: event.nick, newnick: event.new_nick },
            );

            let typeExtra = (event.nick === client.user.nick) ? 'nick_self' : '';

            let buffers = state.getBuffersWithUser(networkid, event.new_nick);
            buffers.forEach((buffer) => {
                let ignoreEvent = state.setting('skipHiddenMessages') && !buffer.setting('show_nick_changes');
                if (ignoreEvent && event.nick !== client.user.nick) {
                    return;
                }

                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '',
                    message: messageBody,
                    type: 'nick',
                    type_extra: typeExtra,
                });
            });
        }

        if (command === 'userlist') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            let ucNick = client.user.nick.toUpperCase();
            let hadExistingUsers = Object.keys(buffer.users)
                .filter((u) => u !== ucNick)
                .length > 0;
            let users = [];
            event.users.forEach((user) => {
                users.push({
                    user: {
                        nick: user.nick,
                        username: user.ident,
                        hostname: user.hostname,
                    },
                    modes: user.modes,
                });
            });
            state.addMultipleUsersToBuffer(buffer, users);

            if (!hadExistingUsers && network.ircClient.chathistory.isSupported()) {
                // TODO: If this is a reconnect (numConnects > 1) then paginate backwards
                //       until we reach our last message.
                //       OR
                //       Add a marker at the gap between this new chathistory block starts and when
                //       the existing messages end so that we can add a "load missing messages"
                //       button there or have it auto request them when it scrolls into view
                if (
                    buffer.isChannel()
                    && ['all', 'channels'].includes(buffer.setting('auto_request_history'))
                ) {
                    buffer.requestLatestScrollback();
                }
            }
        }

        if (command === 'user updated') {
            const user = network.userByName(event.nick);
            if (user) {
                Object.entries(event).forEach(([key, val]) => {
                    if (key.indexOf('new_') !== 0) {
                        return;
                    }

                    const paramName = key.substr(4);
                    switch (paramName) {
                    case 'gecos':
                        user.realname = val;
                        break;
                    case 'ident':
                        user.username = val;
                        break;
                    case 'hostname':
                        user.host = val;
                        break;
                    default:
                    }
                });
            }
        }

        if (command === 'channel info') {
            let buffer = network.bufferByName(event.channel);
            if (!buffer) {
                return;
            }

            if (event.modes) {
                let modeStrs = [];

                event.modes.forEach((mode) => {
                    let adding = mode.mode[0] === '+';
                    let modeChar = mode.mode.substr(1);

                    if (adding) {
                        state.$set(buffer.modes, modeChar, mode.param);
                    } else if (!adding) {
                        state.$delete(buffer.modes, modeChar);
                    }

                    modeStrs.push(mode.mode + (mode.param ? ' ' + mode.param : ''));
                });

                if (buffer.flags.requested_modes) {
                    state.addMessage(buffer, {
                        time: eventTime,
                        server_time: serverTime,
                        nick: '*',
                        message: buffer.name + ' ' + modeStrs.join(', '),
                    });
                }
            }

            if (event.created_at) {
                buffer.created_at = new Date(event.created_at * 1000);
            }

            if (event.created_at && buffer.flags.requested_modes) {
                let tFormat = buffer.setting('timestamp_full_format');
                let timeCreated = tFormat ?
                    strftime(tFormat, new Date(event.created_at * 1000)) :
                    (new Date(event.created_at * 1000)).toLocaleString();

                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '*',
                    message: buffer.name + ' ' + timeCreated,
                });
            }
        }

        if (command === 'mode') {
            let buffer = network.bufferByName(event.target);
            let modeStrs = {};
            if (buffer) {
                // Join all the same mode changes together so they can be shown on one
                // line such as "prawnsalad sets +b on nick1, nick2"
                event.modes.forEach((mode) => {
                    modeStrs[mode.mode] = modeStrs[mode.mode] || [];

                    // If this mode has a user prefix then we need to update the user object
                    let prefix = _.find(network.ircClient.network.options.PREFIX, {
                        mode: mode.mode[1],
                    });

                    if (prefix) {
                        let user = state.getUser(network.id, mode.param);
                        if (user) {
                            let adding = mode.mode[0] === '+';
                            let modes = user.buffers[buffer.id].modes;
                            let modeIdx = modes.indexOf(prefix.mode);

                            // Add or remove the mode from the users mode list
                            if (adding && modeIdx === -1) {
                                modes.push(prefix.mode);
                            } else if (!adding && modeIdx > -1) {
                                modes.splice(modeIdx, 1);
                            }
                        }

                        modeStrs[mode.mode].push({ target: mode.param });
                    } else {
                        // Not a user prefix, add it as a channel mode
                        // TODO: Why are these not appearing as the 'channel info' command?
                        let adding = mode.mode[0] === '+';
                        let modeChar = mode.mode.substr(1);

                        if (adding) {
                            state.$set(buffer.modes, modeChar, mode.param);
                        } else if (!adding) {
                            state.$delete(buffer.modes, modeChar);
                        }

                        modeStrs[mode.mode].push({ target: buffer.name, param: mode.param });
                    }
                });

                // Mode -> locale ID mappings
                // If a mode isn't found here, the local ID modes_other is used
                let modeLocaleIds = {
                    '+o': 'modes_give_ops',
                    '-o': 'modes_take_ops',
                    '+h': 'modes_give_halfops',
                    '-h': 'modes_take_halfops',
                    '+v': 'modes_give_voice',
                    '-v': 'modes_take_voice',
                    '+a': 'modes_give_admin',
                    '-a': 'modes_take_admin',
                    '+q': 'modes_give_owner',
                    '-q': 'modes_take_owner',
                    '+b': 'modes_gives_ban',
                    '-b': 'modes_takes_ban',
                };

                let prefixes = network.ircClient.network.options.PREFIX;
                Object.keys(modeLocaleIds).forEach((mode) => {
                    let supported = mode[1] === 'b' || prefixes.find((p) => mode[1] === p.mode);
                    if (!supported) {
                        delete modeLocaleIds[mode];
                    }
                });

                // Some modes have specific data for its locale data while most
                // use a default. The returned objects are passed to the translation
                // functions to build the translation
                let modeLocaleDataBuilders = {
                    default(targets, mode) {
                        const paramStr = targets.map((t) => t.param).filter((p) => !!p).join(', ');
                        return {
                            mode: mode + (paramStr ? ' ' + paramStr : ''),
                            target: targets[0].target,
                            nick: event.nick,
                        };
                    },
                    b(targets, mode) {
                        return {
                            mode: mode,
                            target: targets.map((t) => t.param).join(', '),
                            nick: event.nick,
                        };
                    },
                };

                // Show one line per mode, listing each effecting user
                _.each(modeStrs, (targets, mode) => {
                    let targetNicks = targets.map((t) => t.target);
                    let ignoreEvent = state.setting('skipHiddenMessages') && !buffer.setting('show_mode_changes');
                    let isUserInvolved = [event.nick, ...targetNicks].includes(client.user.nick);
                    if (ignoreEvent && !isUserInvolved) {
                        return;
                    }

                    // Find a locale data builder for this mode
                    let builders = modeLocaleDataBuilders;
                    let localeDataFn = builders[mode[1]] || builders.default;
                    let localeData = localeDataFn(targets, mode);

                    // Translate using the built locale data
                    let localeKey = modeLocaleIds[mode] || 'modes_other';
                    let text = TextFormatting.t(localeKey, localeData);

                    let messageBody = TextFormatting.formatText('mode', {
                        nick: event.nick,
                        username: event.ident,
                        host: event.hostname,
                        target: targetNicks.join(', '),
                        text,
                    });

                    let typeExtra = (isUserInvolved) ?
                        'mode_self' :
                        '';

                    state.addMessage(buffer, {
                        time: eventTime,
                        server_time: serverTime,
                        nick: '',
                        message: messageBody,
                        type: 'mode',
                        type_extra: typeExtra,
                    });
                });
            } else {
                if (event.target === network.nick) {
                    let user = network.currentUser();

                    event.modes.forEach((item) => {
                        if (item.mode[0] === '+') {
                            const existIdx = user.modes.findIndex(
                                (uItem) => uItem.mode === item.mode[1]
                            );
                            if (existIdx === -1) {
                                user.modes.push({
                                    mode: item.mode[1],
                                    param: item.param,
                                });
                            }
                        } else {
                            const removeIdx = user.modes.findIndex(
                                (uItem) => uItem.mode === item.mode[1]
                            );

                            if (removeIdx !== -1) {
                                user.modes.splice(removeIdx, 1);
                            }
                        }
                    });
                }

                // target is not a channel buffer (user mode ?)
                // if mode had param, show in a new line
                let modeslines = {};

                // Group each - or + modes to each of their own message lines
                event.modes.forEach((mode) => {
                    if (mode.param) {
                        modeslines[mode.mode] = ' ' + mode.param;
                    } else if (mode.mode[0] === '-') {
                        if (!modeslines['-']) {
                            modeslines['-'] = '';
                        }
                        modeslines['-'] += mode.mode.slice(1);
                    } else {
                        if (!modeslines['+']) {
                            modeslines['+'] = '';
                        }
                        if (mode.mode[0] === '+') {
                            modeslines['+'] += mode.mode.slice(1);
                        } else {
                            modeslines['+'] += mode.mode;
                        }
                    }
                });

                let serverBuffer = network.serverBuffer();
                _.each(modeslines, (mode, value) => {
                    let text = TextFormatting.t('modes_other', {
                        nick: event.nick,
                        target: event.target,
                        mode: value + mode,
                    });
                    let messageBody = TextFormatting.formatText('mode', {
                        nick: event.nick,
                        username: event.ident,
                        host: event.hostname,
                        target: event.target,
                        text,
                    });
                    state.addMessage(serverBuffer, {
                        time: eventTime,
                        server_time: serverTime,
                        nick: '',
                        message: messageBody,
                        type: 'mode',
                        type_extra: 'mode_self',
                    });
                });
            }
        }

        if (command === 'banlist') {
            let buffer = state.getBufferByName(networkid, event.channel);
            let serverBuffer = network.serverBuffer();
            let targetBuffer = buffer || serverBuffer;

            if (!buffer || buffer.flags.requested_banlist) {
                let banText = '\x02';

                if (targetBuffer === serverBuffer) {
                    banText += event.channel + '  ';
                }
                banText += TextFormatting.t('banned') + ' [+b]\x02\n';

                if (!event.bans || event.bans.length === 0) {
                    banText += TextFormatting.t('bans_nobody');
                } else {
                    _.each(event.bans, (ban) => {
                        let dateStr = (new Date(ban.banned_at * 1000)).toLocaleDateString();
                        banText += `${ban.banned} [\x1d${ban.banned_by}, ${dateStr}\x1d]\n`;
                    });
                }

                state.addMessage(targetBuffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '',
                    message: banText,
                    type: 'banlist',
                });

                if (buffer) {
                    buffer.flag('requested_banlist', false);
                }
            }
        }

        if (command === 'inviteList') {
            let buffer = state.getBufferByName(networkid, event.channel);
            let serverBuffer = network.serverBuffer();
            let targetBuffer = buffer || serverBuffer;

            if (!buffer || buffer.flags.requested_invitelist) {
                let inviteText = '\x02';

                if (targetBuffer === serverBuffer) {
                    inviteText += event.channel + '  ';
                }
                inviteText += TextFormatting.t('invited') + ' [+I]\x02\n';

                if (!event.invites || event.invites.length === 0) {
                    inviteText += TextFormatting.t('invited_nobody');
                } else {
                    _.each(event.invites, (invite) => {
                        let dateStr = (new Date(invite.invited_at * 1000)).toLocaleDateString();
                        inviteText += `${invite.invited} [\x1d${invite.invited_by}, ${dateStr}\x1d]\n`;
                    });
                }

                state.addMessage(targetBuffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '',
                    message: inviteText,
                    type: 'invitelist',
                });

                if (buffer) {
                    buffer.flag('requested_invitelist', false);
                }
            }
        }

        if (command === 'topic') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            buffer.topic = event.topic || '';

            let typeExtra = '';
            let messageBody = '';

            if (event.nick) {
                buffer.topic_by = event.nick;
                buffer.topic_when = event.time || Date.now();

                typeExtra = 'topic_change';
                messageBody = TextFormatting.formatAndT(
                    'channel_topic',
                    null,
                    'changed_topic_to',
                    { nick: event.nick, topic: buffer.topic },
                );
            } else if (buffer.topic.trim()) {
                typeExtra = 'topic_join';
                messageBody = TextFormatting.formatText('channel_topic', buffer.topic);
            }

            if (messageBody) {
                state.addMessage(buffer, {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '',
                    message: messageBody,
                    type: 'topic',
                    type_extra: typeExtra,
                });
            }
        }

        if (command === 'topicsetby') {
            let buffer = network.bufferByName(event.channel);
            if (buffer) {
                buffer.topic_by = event.nick;
                buffer.topic_when = event.when * 1000;
            }
        }

        if (command === 'help') {
            let buffer = state.getOrAddBufferByName(networkid, '*help');
            state.addMessage(buffer, {
                time: eventTime,
                server_time: serverTime,
                nick: '',
                message: event.help,
                type: 'help',
                tags: event.tags || {},
            });
        }

        if (command === 'ctcp response' || command === 'ctcp request') {
            let buffer = network.bufferByName(event.target) || network.serverBuffer();
            let textFormatId = command === 'ctcp response' ?
                'ctcp_response' :
                'ctcp_request';
            let messageBody = TextFormatting.formatText(textFormatId, {
                nick: event.nick,
                message: event.message,
                type: event.type,
            });

            state.addMessage(buffer, {
                time: eventTime,
                server_time: serverTime,
                nick: '',
                message: messageBody,
                type: 'error',
            });

            if (command === 'ctcp request' && event.type === 'VERSION') {
                let target = event.from_server ?
                    event.hostname :
                    event.nick;
                client.ctcpResponse(target, 'VERSION', 'Kiwi IRC');
            }
        }

        if (command === 'nick invalid') {
            let messageBody = TextFormatting.formatText('general_error', {
                text: event.reason,
            });
            let buffer = state.getActiveBuffer();
            state.addMessage(buffer, {
                time: eventTime,
                server_time: serverTime,
                nick: '',
                message: messageBody,
                type: 'error',
            });

            if (!isRegistered) {
                network.last_error_numeric = 432;
                network.last_error = event.reason;
                network.ircClient.quit();
            }
        }

        if (command === 'loggedin' || command === 'loggedout') {
            let translationKey = command === 'loggedin' ? 'logged_in' : 'logged_out';

            let buffers = [network.serverBuffer()];
            let activeBuffer = state.getActiveBuffer();
            if (activeBuffer?.networkid === network.id && activeBuffer !== buffers[0]) {
                buffers.push(activeBuffer);
            }

            let messageBody = TextFormatting.formatAndT(
                'notice',
                null,
                translationKey,
                { account: event.account }
            );

            buffers.forEach((buffer) => {
                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: messageBody,
                    type: 'notice',
                });
            });
        }

        if (command === 'sasl failed') {
            let failMessage = TextFormatting.formatAndT(
                'general_error',
                null,
                'login_failed'
            );

            let buffers = [network.serverBuffer()];
            let activeBuffer = state.getActiveBuffer();
            if (activeBuffer?.networkid === network.id && activeBuffer !== buffers[0]) {
                buffers.push(activeBuffer);
            }

            let disconnectOnSaslFail = network.ircClient.connection.options.sasl_disconnect_on_fail;

            if (disconnectOnSaslFail && network.state !== 'connected') {
                // The client is going to disconnect set last_error so it is show to the user
                network.last_error = failMessage;
            }

            if (!disconnectOnSaslFail) {
                // Only add messages if the client is not going to disconnect on failure
                buffers.forEach((buffer) => {
                    state.addMessage(buffer, {
                        time: Date.now(),
                        nick: '',
                        message: failMessage,
                        type: 'error',
                    });
                });
            }
        }

        if (command === 'irc error') {
            let buffer;
            if (event.channel || event.nick) {
                buffer = state.getOrAddBufferByName(network.id, event.channel || event.nick);
            }
            if (!buffer) {
                buffer = network.serverBuffer();
            }

            if (!buffer) {
                // we could not find a buffer, this is likely because the network was removed
                return;
            }

            // TODO: Some of these errors contain a .error property which we can match against,
            // ie. password_mismatch.

            if (event.error && !isRegistered) {
                if (event.error === 'password_mismatch') {
                    network.last_error = TextFormatting.t('error_password_mismatch');
                }
            }

            if (event.error === 'bad_channel_key') {
                buffer.flags.channel_badkey = true;
            }

            // ignore error 432 (erroneous nickname) as it is handled above
            if (event.reason && network.last_error_numeric !== 432) {
                if (!isRegistered) {
                    network.last_error = event.reason;
                }

                let messageRaw = event.reason || event.error;
                if (event.error === 'unknown_command') {
                    messageRaw = `${messageRaw} "${event.command}"`;
                }

                let messageBody = TextFormatting.formatText('general_error', {
                    text: messageRaw,
                });

                let message = {
                    time: eventTime,
                    server_time: serverTime,
                    nick: '',
                    message: messageBody,
                    type: 'error',
                };

                if (event.error === 'cannot_send_to_channel') {
                    // Only add this message if it does not match the previous message
                    // Typing status messages can cause a spam of this error type
                    state.addMessageNoRepeat(buffer, message);
                    return;
                }

                state.addMessage(buffer, message);
            }

            // Getting an error about a channel while we are not joined means that we couldn't join
            // or do some action on it. Disable it until we manually reattempt to join.
            if (buffer.isChannel() && !buffer.joined) {
                buffer.enabled = false;
            }
        }

        next();
    }
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
