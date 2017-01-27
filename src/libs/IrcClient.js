import Irc from 'irc-framework/browser';
import * as ServerConnection from './ServerConnection';

export function create(state, networkid) {
    let network = state.getNetwork(networkid);

    let clientOpts = {
        host: network.connection.server,
        port: network.connection.port,
        tls: network.connection.tls,
        password: network.connection.password,
        nick: network.nick,
        username: network.nick,
        gecos: 'https://kiwiirc.com/',
        version: 'Kiwi IRC',
        auto_reconnect: false,
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
    ircClient.use(clientMiddleware(state, networkid));

    // Overload the connect() function to make sure we are connecting with the
    // most recent connection details from the state
    let originalIrcClientConnect = ircClient.connect;
    ircClient.connect = function connect(...args) {
        ircClient.options.host = network.connection.server;
        ircClient.options.port = network.connection.port;
        ircClient.options.tls = network.connection.tls;
        ircClient.options.password = network.connection.password;
        ircClient.options.nick = network.nick;

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

    return function middlewareFn(client, rawEvents, parsedEvents) {
        parsedEvents.use(parsedEventsHandler);
        parsedEvents.use(rawEventsHandler);

        client.on('connecting', () => {
            network.state = 'connecting';
        });

        client.on('connected', () => {
            network.state = 'connected';
        });

        client.on('socket close', () => {
            network.state = 'disconnected';
        });
    };


    function rawEventsHandler(command, event, client, next) {
        next();
    }


    function parsedEventsHandler(command, event, client, next) {
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

            // Join our channels
            network.buffers.forEach(buffer => {
                if (buffer.isChannel() && buffer.joined) {
                    client.join(buffer.name);
                }
            });
        }

        if (command === 'server options') {
            // If the network name has changed from the irc-framework default, update ours
            if (client.network.name !== 'Network') {
                network.name = client.network.name;
            }
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

            let buffer = state.getOrAddBufferByName(networkid, bufferName);
            let messageBody = event.message;

            // Turns actions into "* prawnsalad does a action"
            if (event.type === 'action') {
                messageBody = '* ' + event.nick + ' ' + messageBody;
            }

            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: event.nick,
                message: messageBody,
                type: event.type,
            });
        }

        if (command === 'join') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            state.addUserToBuffer(buffer, { nick: event.nick });

            if (event.nick === client.user.nick) {
                buffer.joined = true;
                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: 'You have joined',
                    type: 'traffic',
                    type_extra: 'join',
                });
            } else {
                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: `${event.nick} has joined`,
                    type: 'traffic',
                    type_extra: 'join',
                });
            }
        }
        if (command === 'kick') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            state.removeUserFromBuffer(buffer, { nick: event.nick });

            if (event.kicked === client.user.nick) {
                buffer.joined = false;
                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: `${event.nick} kicked you from ${event.channel} (${event.message})`,
                    type: 'traffic',
                    type_extra: 'kick',
                });
            } else {
                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: `${event.kicked} was kicked from ${event.channel} by ${event.nick}` +
                             ` (${event.message})`,
                    type: 'traffic',
                    type_extra: 'kick',
                });
            }
        }
        if (command === 'part') {
            let buffer = state.getBufferByName(networkid, event.channel);
            state.removeUserFromBuffer(buffer, { nick: event.nick });

            if (event.nick === client.user.nick) {
                if (buffer) {
                    buffer.joined = false;
                }
                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: 'You have left',
                    type: 'traffic',
                    type_extra: 'part',
                });
            } else {
                state.addMessage(buffer, {
                    time: Date.now(),
                    nick: '',
                    message: `${event.nick} has left (${event.message})`,
                    type: 'traffic',
                    type_extra: 'part',
                });
            }
        }
        if (command === 'quit') {
            let buffers = state.getBuffersWithUser(networkid, event.nick);

            buffers.forEach(buffer => {
                if (event.nick === client.user.nick) {
                    if (buffer) {
                        buffer.joined = false;
                    }
                    state.addMessage(buffer, {
                        time: Date.now(),
                        nick: '',
                        message: `You have left (${event.message})`,
                        type: 'traffic',
                        type_extra: 'quit',
                    });
                } else {
                    state.addMessage(buffer, {
                        time: Date.now(),
                        nick: '',
                        message: `${event.nick} has left (${event.message})`,
                        type: 'traffic',
                        type_extra: 'quit',
                    });
                }
            });

            state.removeUser(networkid, {
                nick: event.nick,
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

        if (command === 'motd') {
            let buffer = network.serverBuffer();
            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: '',
                message: event.motd,
                type: 'motd',
            });
        }

        if (command === 'nick in use' && !client.connection.registered) {
            let newNick = client.user.nick + rand(1, 100);
            let serverBuffer = network.serverBuffer();
            state.addMessage(serverBuffer, {
                time: Date.now(),
                nick: '',
                message: `Nickname '${client.user.nick}' is already in use. Trying '${newNick}'..`,
            });
            client.changeNick(newNick);
        }

        if (command === 'nick') {
            if (event.nick === client.user.nick) {
                network.nick = event.new_nick;
            }

            state.changeUserNick(networkid, event.nick, event.new_nick);

            let buffers = state.getBuffersWithUser(networkid, event.new_nick);
            buffers.forEach(buffer => {
                state.addMessage(buffer, {
                    time: event.time || Date.now(),
                    nick: '',
                    message: `${event.nick} is now known as ${event.new_nick}`,
                    type: 'nick',
                });
            });
        }

        if (command === 'userlist') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            event.users.forEach(user => {
                state.addUserToBuffer(buffer, { nick: user.nick });
            });
        }

        if (command === 'topic') {
            let buffer = state.getOrAddBufferByName(networkid, event.channel);
            buffer.topic = event.topic || '';
            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: '',
                message: event.nick ?
                    event.nick + ' changed the topic to: ' + event.topic :
                    event.topic,
                type: 'topic',
            });
        }

        if (command === 'irc error') {
            let buffer = network.serverBuffer();
            state.addMessage(buffer, {
                time: event.time || Date.now(),
                nick: '',
                message: event.reason || event.error,
                type: 'error',
            });
        }

        next();
    }
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
