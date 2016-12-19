import SockJS from 'sockjs-client';
import EventEmitter from 'eventemitter3';

/**
 * Multiplexed channels over a websocket connection
 *     * Only allow 1 websocket per server
 *     * Multiple channels through a single websocket
 *     * A channel per IRC network connection
 * Messages are prefixed with : and the channel name then a space. eg:
 *     :1 Here is the data
 *
 * Example protocol chatter:
 *     Client > START             Client tells the server it's starting a session
 *     Server > SESSION 1234      Server sends the client the current session ID
 *     Client > :1                Client is creating a new channel, ID 1
 *     Server > :1                Server acknowledges the new channel, ID 1
 *     Client > :1 some data      Client sends data over channel 1 to the server
 *     Server > :1 some data      Server sends data over channel 1 to the client
 *     Client > :2                Client is creating a new channel, ID 2
 *     Server > :2                Server acknowledges the new channel, ID 2
 */

const serverConnections = Object.create(null);
const controlChannel = '0';

export function createChannelConstructor(_addr, sessionId, _socketChannel) {
    let addr = _addr.toLowerCase();

    if (!serverConnections[addr]) {
        serverConnections[addr] = createNewConnection(addr, sessionId);
    }

    // If a channel ID hasn't been specified, create a new one
    let socketChannel = _socketChannel;
    if (!socketChannel) {
        socketChannel = serverConnections[addr].nextChannelId++;
    }

    return createChannelOnConnection(
        serverConnections[addr],
        socketChannel
    );
}


/**
 * Creates a new socket connection to a kiwi server.
 * Channels will be created on this connection to send data back and forth.
 */
function createNewConnection(wsAddr, sessionId) {
    console.log('createNewConnection()', wsAddr, sessionId);
    let connection = new EventEmitter();
    connection.sessionId = '';

    serverConnections[wsAddr] = connection;

    connection.nextChannelId = 1;
    connection.connected = false;

    connection.reconnect =
    connection.connect = function connect() {
        console.log('createNewConnection connect()', wsAddr);
        if (connection.ws) {
            try {
                connection.ws.close();
            } catch (err) {
                // Ignore any closing errors. Most likely due to not
                // being connected yet.
            }

            connection.ws = null;
        }
        connection.ws = new SockJS(wsAddr);
        connection.ws.onopen = () => {
            console.log('[ws] onopen');
            let connectStr = sessionId ?
                'CONTROL SESSION ' + sessionId :
                'CONTROL START';
            connection.ws.send(`:${controlChannel} ${connectStr}`);
            connection.connected = true;
            connection.emit('open');
        };
        connection.ws.onclose = () => {
            console.log('[ws] onclose');
            connection.connected = false;
            connection.ws = null;
            connection.emit('close');
        };
        connection.ws.onmessage = (event) => {
            console.log('[ws] onmessage', event.data);
            connection.emit('message', event);

            // If the message starts with ":channel " then extract that channel and emit
            // an event for it.
            if (event.data[0] === ':') {
                let message = event.data;
                let spacePos = message.indexOf(' ');

                // If no space, ie. ":1", this is the server acknowledging this channel
                // is now open and ready to be used.
                if (spacePos === -1) {
                    connection.emit('open.' + message.substr(1));
                    return;
                }

                let channelId = message.substr(1, spacePos - 1);
                event.data = message.substr(spacePos + 1);
                connection.emit('message.' + channelId, event);
            } else {
                // Core messages. Used for session handling and session syncing
                let parts = event.data.split(' ');

                if (parts[0] === 'SESSION') {
                    connection.sessionId = parts[1];
                    console.log(`[SESSION ${connection.sessionId}]`);
                }
            }
        };
    };

    connection.connect();
    return connection;
}


/**
 * Create a channel on a server connection.
 * The ConnectionChannel implements an IrcFramework transport
 */
function createChannelOnConnection(connection, channelId) {
    return function ConnectionChannel(options) {
        let sendControlBuffer = [];
        let channel = new EventEmitter();
        channel.id = channelId;
        channel.isOpen = false;
        channel.state = 0; // TODO: Is this used anywhere?
        // 0 = disconnected, 1 = connected
        channel.remoteState = 0;

        // When the websocket opens, open this channel on it
        connection.on('open', () => {
            connection.ws.send(':' + channelId);
        });
        // When we get confirmation of this channel being opened, send any control
        // messages that were buffered
        connection.on('open.' + channelId, () => {
            console.log('channel', channelId, 'open');
            channel.isOpen = true;
            // channel.emit('open');
            if (sendControlBuffer.length) {
                sendControlBuffer.forEach(line => {
                    channel.sendControl(line);
                });
                sendControlBuffer = [];
            }

            // This channel is now open and can start sending data to the server
            channel.remoteState = 1;
            channel.emit('open');
        });
        connection.on('close', () => {
            channel.state = 3;
            channel.remoteState = 0;
            channel.isOpen = false;
            channel.emit('close');
        });
        connection.on('message.' + channelId, (event) => {
            if (event.data.indexOf('CONTROL ') === 0) {
                console.log('[CHANNEL ' + channelId + ' control] ' + event.data);
                // When we get the signal that the connection to the IRC server
                // has connected, start proxying all data
                if (event.data.indexOf('CONTROL CONNECTED') === 0) {
                    channel.remoteState = 1;
                    channel.emit('open');
                }

                if (event.data.indexOf('CONTROL CLOSED') === 0) {
                    channel.remoteState = 0;
                    channel.emit('close');
                }
            }

            if (channel.remoteState === 1) {
                // console.log('[CHANNEL ' + channelId + ' data] ' + event.data);
                channel.emit('line', event.data);
            }
        });

        // Send a control message to the server (not relayed to an IRC network)
        channel.sendControl = function writeTarget(data) {
            if (channel.isOpen) {
                connection.ws.send(':' + channelId + ' ' + data);
            } else {
                sendControlBuffer.push(data);
            }
        };

        channel.writeLine = function writeTarget(data) {
            // Buffer the data if the socket has not yet been sent
            if (channel.remoteState >= 1) {
                connection.ws.send(':' + channelId + ' ' + data);
            }
        };

        // Tell the server to connect to an IRC network
        channel.connect = function connect() {
            // Clear any buffered control messages so we have a clean slate
            sendControlBuffer = [];

            // If the websocket is not connected, try to reconnect it
            if (!connection.ws) {
                connection.reconnect();
            }

            let host = options.host;
            let port = options.port;
            let tls = options.tls || options.ssl;
            channel.sendControl('HOST ' + host + ':' + (tls ? '+' : '') + port);
        };

        // This is not supported but irc-framework transports need it, so just noop it
        channel.setEncoding = function setEncoding() {};

        // Let the server know of this new channel if we're already connected
        if (connection.connected) {
            connection.ws.send(':' + channelId);
        }

        return channel;
    };
}
