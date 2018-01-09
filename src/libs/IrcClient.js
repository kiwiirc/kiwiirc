import _ from 'lodash';
import strftime from 'strftime';
import Irc from 'irc-framework/browser';
import bouncerMiddleware from './BouncerMiddleware';
import * as ServerConnection from './ServerConnection';
import * as TextFormatting from '@/helpers/TextFormatting';

export function create(state, networkid) {
    let network = state.getNetwork(networkid);

    let clientOpts = {
        host: network.connection.server,
        port: network.connection.port,
        tls: network.connection.tls,
        path: network.connection.path,
        password: network.connection.password,
        nick: network.nick,
        username: network.username || network.nick,
        gecos: network.gecos || 'https://kiwiirc.com/',
        version: null,
        auto_reconnect: false,
        encoding: network.connection.encoding,
    };

    // A direct connection uses a websocket to connect (note: some browsers limit
    // the number of connections to the same host!).
    // A non-direct connection will connect via the configured kiwi server using
    // with our own irc-framework compatible transport.
    if (!network.connection.direct) {
        clientOpts.transport = ServerConnection.createChannelConstructor(
            state.settings.kiwiServer,
            (window.location.hash || '').substr(1),
            networkid
        );
    }

    let ircClient = new Irc.Client(clientOpts);
    ircClient.requestCap('znc.in/self-message');
    ircClient.use(clientMiddleware(state, networkid));
    ircClient.use(bouncerMiddleware());

    // Overload the connect() function to make sure we are connecting with the
    // most recent connection details from the state
    let originalIrcClientConnect = ircClient.connect;
    ircClient.connect = function connect(...args) {
        let bnc = state.setting('bnc');
        if (bnc.active) {
            let netname = network.connection.bncname;
            let password = '';

            // bnccontrol is the control connection for BOUNCER commands, not a network
            if (network.name === 'bnccontrol') {
                password = `${bnc.username}:${bnc.password}`;
            } else {
                password = `${bnc.username}/${netname}:${bnc.password}`;
            }

            ircClient.options.host = bnc.server;
            ircClient.options.port = bnc.port;
            ircClient.options.tls = bnc.tls;
            ircClient.options.password = password;
            ircClient.options.nick = network.nick;
            ircClient.options.encoding = network.connection.encoding;
        } else {
            ircClient.options.host = network.connection.server;
            ircClient.options.port = network.connection.port;
            ircClient.options.tls = network.connection.tls;
            ircClient.options.password = network.connection.password;
            ircClient.options.nick = network.nick;
            ircClient.options.username = network.username || network.nick;
            ircClient.options.gecos = network.gecos || 'https://kiwiirc.com/';
            ircClient.options.encoding = network.connection.encoding;
        }

        state.$emit('network.connecting', { network });
        originalIrcClientConnect.apply(ircClient, args);
    };

    ircClient.on('raw', event => {
        if (!network.setting('show_raw')) {
            return;
        }

        let buffer = state.getOrAddBufferByName(networkid, '*raw');
        state.addMessage(buffer, {
            time: Date.now(),
            nick: '',
            message: (event.from_server ? '[S] ' : '[C] ') + event.line,
        });
    });

    return ircClient;
}

function clientMiddleware(state, networkid) {
    let network = state.getNetwork(networkid);
    let numConnects = 0;
    // Requested chathistory for this connection yet
    let requestedCh = false;

    return function middlewareFn(client, rawEvents, parsedEvents) {
        parsedEvents.use(parsedEventsHandler);
        rawEvents.use(rawEventsHandler);

        client.on('connecting', () => {
            network.state_error = '';
            network.state = 'connecting';
        });

        client.on('connected', () => {
            network.state_error = '';
            network.state = 'connected';

            network.buffers.forEach(buffer => {
                if (!buffer) {
                    return;
                }

                let messageBody = TextFormatting.formatText('network_connected', {
                    text: 'Connected',
                });

                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: messageBody,
                    type: 'connection',
                    type_extra: 'connected',
                });
            });
        });

        client.on('socket close', (err) => {
            network.state = 'disconnected';
            network.state_error = err || '';

            network.buffers.forEach(buffer => {
                if (!buffer) {
                    return;
                }

                let messageBody = TextFormatting.formatText('network_disconnected', {
                    text: 'Disconnected',
                });

                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: messageBody,
                    type: 'connection',
                    type_extra: 'disconnected',
                });
            });
        });
    };


    function rawEventsHandler(command, event, rawLine, client, next) {
        state.$emit('irc:raw', command, event, network);
        next();
    }


    function parsedEventsHandler(command, event, client, next) {
        // Trigger this event through the state object first. If it's been handled
        // somewhere else then we ignore it.
        let ircEventObj = { handled: false };
        state.$emit('irc:' + command, event, network, ircEventObj);
        if (ircEventObj.handled) {
            next();
            return;
        }

        if (command === 'registered') {
            if (client.options.nickserv) {
                let options = client.options.nickserv;
                client.say('nickserv', 'identify ' + options.account + ' ' + options.password);
            }

            network.nick = event.nick;
            state.addUser(networkid, { nick: event.nick, username: client.user.username });

            let serverBuffer = network.serverBuffer();
            state.addMessage(serverBuffer, {
                time: Date.now(),
                nick: '',
                message: `Connected to ${client.network.name}!`,
            });

            // Get some extra info about ourselves
            client.raw('WHO ' + event.nick);

            if (network.auto_commands) {
                network.auto_commands.split('\n').forEach(line => {
                    state.$emit('input.raw', line[0] === '/' ? line : `/${line}`);
                });
            }

            // Join our channels
            // If under bouncer mode, the bouncer will send the channels were joined to instead.
            if (!network.connection.bncname) {
                network.buffers.forEach(buffer => {
                    if (buffer.isChannel() && buffer.enabled) {
                        client.join(buffer.name, buffer.key);
                    }
                });
            }

            // Haven't yet requested chathistory for this connection
            requestedCh = false;
            numConnects++;
        }

        if (command === 'server options') {
            // If the network name has changed from the irc-framework default, update ours
            if (client.network.name !== 'Network') {
                network.name = client.network.name;
            }

            let historySupport = !!network.ircClient.network.supports('chathistory');

            // If this is a reconnect then request chathistory from our last position onwards
            // to get any missed messages. (bouncer mode only)
            if (numConnects > 1 && !requestedCh && historySupport && network.connection.bncname) {
                requestedCh = true;
                network.buffers.forEach(buffer => {
                    if (buffer.isChannel() || buffer.isQuery()) {
                        buffer.requestScrollback('forward');
                    }
                });
            }

            // The first time we connect in bouncer mode, request the last 50 messages for every
            // buffer we have
            if (numConnects === 1 && !requestedCh && historySupport && network.connection.bncname) {
                requestedCh = true;
                let time = strftime('%FT%T.%L%:z', new Date());
                network.ircClient.raw(`CHATHISTORY * timestamp=${time} message_count=-50`);
            }
        }

        // Show unhandled data from the server in the servers tab
        if (command === 'unknown command') {
            let buffer = network.serverBuffer();
            let message = '';

            // Only show non-numeric commands
            if (!event.command.match(/^\d+$/)) {
                message += event.command + ' ';
            }

            let containsNick = event.params[0] === network.ircClient.user.nick;
            let isChannelMessage = network.isChannelName(event.params[1]);

            // Strip out the nick if it's the first params (many commands include this)
            if (containsNick && isChannelMessage) {
                let channelBuffer = network.bufferByName(event.params[1]);
                if (channelBuffer) {
                    buffer = channelBuffer;
                }
                message += event.params.slice(2).join(', ');
            } else if (containsNick) {
                message += event.params.slice(1).join(', ');
            } else {
                message += event.params.join(', ');
            }

            state.addMessage(buffer, {
                nick: '',
                message: message,
            });
        }

        if (command === 'message') {
            let isPrivateMessage = false;
            let bufferName = event.from_server ? '*' : event.target;

            // PMs should go to a buffer with the name of the other user
            if (!event.from_server && event.target === client.user.nick) {
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
                if (!existingBuffer) {
                    bufferName = '*';
                }
            }

            let buffer = state.getOrAddBufferByName(networkid, bufferName);

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

            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: event.nick,
                message: messageBody,
                type: event.type,
                tags: event.tags,
            });
        }

        if (command === 'wallops') {
            let buffer = state.getOrAddBufferByName(networkid, '*');
            let messageBody = TextFormatting.formatText('wallops', {
                text: event.message,
            });

            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: event.nick,
                message: messageBody,
                type: 'wallops',
            });
        }

        if (command === 'join') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            state.addUserToBuffer(buffer, {
                nick: event.nick,
                username: event.ident,
                host: event.hostname,
                realname: event.gecos,
            });

            if (event.nick === client.user.nick) {
                buffer.joined = true;
                network.ircClient.raw('MODE', event.channel);
                network.ircClient.who(event.channel);
            }

            let messageBody = TextFormatting.formatText('channel_join', {
                nick: event.nick,
                username: event.ident,
                host: event.hostname,
                text: 'has joined',
            });

            state.addMessage(buffer, {
                time: Date.now(),
                nick: event.nick,
                message: messageBody,
                type: 'traffic',
                type_extra: 'join',
            });
        }
        if (command === 'kick') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            state.removeUserFromBuffer(buffer, event.kicked);

            let messageBody = '';

            if (event.kicked === client.user.nick) {
                buffer.joined = false;
                buffer.clearUsers();
                messageBody = TextFormatting.formatText('channel_selfkick', {
                    nick: event.nick,
                    username: event.ident,
                    host: event.hostname,
                    text: `${event.nick} kicked you from ${event.channel} (${event.message})`,
                });
            } else {
                messageBody = TextFormatting.formatText('channel_kicked', {
                    nick: event.nick,
                    username: event.ident,
                    host: event.hostname,
                    text: `${event.kicked} was kicked from ${event.channel} by ${event.nick}` +
                          ` (${event.message})`,
                });
            }

            state.addMessage(buffer, {
                time: Date.now(),
                nick: event.nick,
                message: messageBody,
                type: 'traffic',
                type_extra: 'kick',
            });
        }
        if (command === 'part') {
            let buffer = state.getBufferByName(networkid, event.channel);
            if (!buffer) {
                return;
            }

            state.removeUserFromBuffer(buffer, event.nick);
            if (event.nick === client.user.nick) {
                buffer.joined = false;
                buffer.clearUsers();
            }

            let messageBody = TextFormatting.formatText('channel_part', {
                nick: event.nick,
                username: event.ident,
                host: event.hostname,
                text: `has left (${event.message})`,
            });
            state.addMessage(buffer, {
                time: Date.now(),
                nick: event.nick,
                message: messageBody,
                type: 'traffic',
                type_extra: 'part',
            });
        }
        if (command === 'quit') {
            let buffers = state.getBuffersWithUser(networkid, event.nick);

            buffers.forEach(buffer => {
                if (!buffer) {
                    return;
                }

                if (event.nick === client.user.nick) {
                    buffer.joined = false;
                    buffer.clearUsers();
                }

                let messageBody = TextFormatting.formatText('channel_quit', {
                    nick: event.nick,
                    username: event.ident,
                    host: event.hostname,
                    text: `has left (${event.message})`,
                });

                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: event.nick,
                    message: messageBody,
                    type: 'traffic',
                    type_extra: 'quit',
                });
            });

            // Mention the quit in any query windows
            let queryBuffer = network.bufferByName(event.nick);
            if (queryBuffer) {
                let messageBody = TextFormatting.formatText('channel_quit', {
                    nick: event.nick,
                    username: event.ident,
                    host: event.hostname,
                    text: `has left (${event.message})`,
                });

                state.addMessage(queryBuffer, {
                    time: Date.now(),
                    nick: event.nick,
                    message: messageBody,
                    type: 'traffic',
                    type_extra: 'quit',
                });
            }

            state.removeUser(networkid, {
                nick: event.nick,
            });
        }

        if (command === 'invite') {
            let buffer = network.serverBuffer();
            state.addMessage(buffer, {
                nick: '*',
                message: `${event.nick} invited you to join ${event.channel}`,
            });
        }

        if (command === 'whois') {
            let obj = {
                nick: event.nick,
                host: event.host,
                username: event.user,
                away: event.away || '',
                realname: event.real_name,
            };

            // Some other optional bits of info
            [
                'actuallhost',
                'helpop',
                'bot',
                'server',
                'server_info',
                'operator',
                'channels',
                'modes',
                'idle',
                'logon',
                'registered_nick',
                'account',
                'secure',
                'special',
            ].forEach(prop => {
                if (typeof event[prop] !== 'undefined') {
                    obj[prop] = event[prop];
                }
            });

            state.addUser(networkid, obj);
        }

        if (command === 'away') {
            state.addUser(networkid, {
                nick: event.nick,
                away: event.message || '',
            });
        }

        if (command === 'wholist') {
            state.usersTransaction(networkid, users => {
                event.users.forEach(user => {
                    let userObj = {
                        nick: user.nick,
                        host: user.hostname || undefined,
                        username: user.ident || undefined,
                        away: user.away ? 'Away' : '',
                        realname: user.real_name,
                    };
                    state.addUser(networkid, userObj, users);
                });
            });
        }

        if (command === 'channel list start') {
            network.channel_list_cache = [];
            network.channel_list_state = 'updating';
        }
        if (command === 'channel list') {
            // Store the channels in channel_list_cache before moving it all to
            // channel_list at the end. This gives a huge performance boost since
            // it doesn't need to be all reactive for every update
            network.channel_list_cache = network.channel_list_cache.concat(event);
        }
        if (command === 'channel list end') {
            network.channel_list = network.channel_list_cache;
            delete network.channel_list_cache;
            network.channel_list_state = '';
        }

        if (command === 'motd') {
            let buffer = network.serverBuffer();
            let messageBody = TextFormatting.formatText('motd', {
                text: event.motd,
            });
            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: '',
                message: messageBody,
                type: 'motd',
            });
        }

        if (command === 'nick in use' && !client.connection.registered) {
            let newNick = client.user.nick + rand(1, 100);
            let serverBuffer = network.serverBuffer();
            let messageBody = TextFormatting.formatText('nickname_alreadyinuse', {
                text: `Nickname '${client.user.nick}' is already in use. Trying '${newNick}'..`,
            });
            state.addMessage(serverBuffer, {
                time: Date.now(),
                nick: '',
                message: messageBody,
            });
            client.changeNick(newNick);
        }

        if (command === 'nick') {
            if (event.nick === client.user.nick) {
                network.nick = event.new_nick;
            }

            state.changeUserNick(networkid, event.nick, event.new_nick);

            let messageBody = TextFormatting.formatText('nick_changed', {
                text: `${event.nick} is now known as ${event.new_nick}`,
            });

            let buffers = state.getBuffersWithUser(networkid, event.new_nick);
            buffers.forEach(buffer => {
                state.addMessage(buffer, {
                    time: event.time || Date.now(),
                    nick: '',
                    message: messageBody,
                    type: 'nick',
                });
            });
        }

        if (command === 'userlist') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            let users = [];
            event.users.forEach(user => {
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
        }

        if (command === 'channel info') {
            let buffer = network.bufferByName(event.channel);
            if (!buffer) {
                return;
            }

            if (event.modes) {
                event.modes.forEach(mode => {
                    let adding = mode.mode[0] === '+';
                    let modeChar = mode.mode.substr(1);

                    if (adding) {
                        state.$set(buffer.modes, modeChar, mode.param);
                    } else if (!adding) {
                        state.$delete(buffer.modes, modeChar);
                    }
                });
            }
        }

        if (command === 'mode') {
            let buffer = network.bufferByName(event.target);
            if (buffer) {
                event.modes.forEach(mode => {
                    let messageBody = TextFormatting.formatText('mode', {
                        nick: event.nick,
                        username: event.ident,
                        host: event.hostname,
                        text: `set ${mode.mode} ${mode.param || ''}`,
                    });
                    state.addMessage(buffer, {
                        time: event.time || Date.now(),
                        nick: '',
                        message: messageBody,
                        type: 'mode',
                    });

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
                    }
                });
            }
        }

        if (command === 'topic') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            buffer.topic = event.topic || '';
            let messageBody = TextFormatting.formatText('channel_topic', {
                nick: event.nick,
                username: event.ident,
                host: event.hostname,
                text: event.nick ?
                    event.nick + ' changed the topic to: ' + event.topic :
                    event.topic,
            });
            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: '',
                message: messageBody,
                type: 'topic',
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
                time: event.time || Date.now(),
                nick: '',
                message: messageBody,
                type: 'error',
            });

            if (command === 'ctcp request' && event.type === 'VERSION') {
                client.ctcpResponse(event.nick, 'VERSION', 'Kiwi IRC');
            }
        }

        if (command === 'irc error') {
            let buffer;
            if (event.channel) {
                buffer = state.getOrAddBufferByName(network.id, event.channel);
            }
            if (!buffer) {
                buffer = network.serverBuffer();
            }

            // TODO: Some of these errors contain a .error property whcih we can match against,
            // ie. password_mismatch.

            if (event.reason) {
                let messageBody = TextFormatting.formatText('general_error', {
                    text: event.reason || event.error,
                });
                state.addMessage(buffer, {
                    time: event.time || Date.now(),
                    nick: '',
                    message: messageBody,
                    type: 'error',
                });
            }
        }

        next();
    }
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
