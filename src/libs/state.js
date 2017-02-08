import Vue from 'vue';
import _ from 'lodash';
import strftime from 'strftime';
import * as IrcClient from './IrcClient';

const stateObj = {
    // May be set by a StatePersistence instance
    persistence: null,

    // Settings may be overridden via config.json
    settings: {
        windowTitle: 'Kiwi IRC - The web IRC client',
        // Restricted to a single IRC server
        restricted: true,
        // The startup screen
        startupScreen: 'customServer',
        // Where to find the kiwi server
        kiwiServer: '/webirc/kiwiirc/',
        // Default buffer settings
        buffers: {
            alert_on: 'highlight',
            timestamp_format: '%H:%M:%S',
            show_timestamps: true,
            scrollback_size: 250,
            show_joinparts: true,
            traffic_as_activity: false,
            coloured_nicklist: true,
            block_pms: false,
            show_emoticons: true,
            mute_sound: false,
        },
        // Startup screen default
        startupOptions: {
            server: '',
            port: 6667,
            tls: false,
            channel: '',
            nick: 'kiwi_?',
            direct: false,
        },
    },
    user_settings: {
        highlights: '',
        aliases: {
            // General aliases
            '/p': '/part $1+',
            '/me': '/action $1+',
            '/j': '/join $1+',
            '/q': '/query $1+',
            '/w': '/whois $1+',
            '/raw': '/quote $1+',
            '/connect': '/server $1+',
            '/cycle': '/lines /part $channel | /join $channel',

            // Op related aliases
            '/op': '/quote mode $channel +o $1+',
            '/deop': '/quote mode $channel -o $1+',
            '/hop': '/quote mode $channel +h $1+',
            '/dehop': '/quote mode $channel -h $1+',
            '/voice': '/quote mode $channel +v $1+',
            '/devoice': '/quote mode $channel -v $1+',
            '/k': '/kick $channel $1+',
            '/ban': '/quote mode $channel +b $1+',
            '/unban': '/quote mode $channel -b $1+',

            // Misc aliases
            '/slap': '/me slaps $1 around a bit with a large trout',
            '/tick': '/msg $channel ✔',
        },
    },
    connection: {
        // disconnected / connecting / connected
        status: 'connected',
        sessionId: '',
    },
    ui: {
        active_network: 0,
        active_buffer: '',
    },
    networks: [
        /* {
            id: 1,
            name: 'sumnetwork',
            state: 'disconnected',
            connection: {
                server: 'irc.freenode.net',
                port: 6667,
                tls: false,
                password: ''
            },
            nick: 'prawnsalad',
            username: 'prawn',
            settings: { show_raw: false },
            buffers: [
                {
                    id: 0,
                    networkid: 1,
                    name: '#kiwiirc',
                    topic: 'A hand-crafted IRC client',
                    joined: true,
                    flags: { unread: 4 },
                    settings: { alert_on: 'all' },
                    users: [ref_to_user_obj],
                },
            ],
            users: {
                prawnsalad: {
                    nick: 'prawnsalad',
                    host: 'isp.net',
                    username: 'prawn',
                    modes: '+ix',
                    buffers: {1: {modes: []}}
                },
            },
        },
        {
            id: 2,
            name: 'snoonet',
            state: 'disconnected',
            connection: {
                server: 'irc.freenode.net',
                port: 6667,
                tls: false,
                password: ''
            },
            nick: 'prawnsalad',
            username: 'prawn',
            buffers: [
                {
                    id: 1
                    networkid: 2,
                    name: '#orangechat',
                    topic: '',
                    joined: false,
                    flags: { unread: 0 },
                    settings: { alert_on: 'all' },
                    users: [ref_to_user_obj],
                },
            ],
            users: {
                prawnsalad: {
                    nick: 'prawnsalad',
                    host: 'isp.net',
                    username: 'prawn',
                    modes: '+ix',
                    buffers: {1: {modes: []}},
                },
                someone: {
                    nick: 'someone',
                    host: 'masked.com',
                    username: 'someirc',
                    modes: '+ix',
                    buffers: {1: {modes: []}},
                },
            },
        }, */
    ],
    messages: [
        /* {
            networkid: 1,
            buffer: '#kiwiirc',
            messages: [
                {
                    time: Date.now(),
                    nick: 'prawnsalad',
                    message: 'hello',
                },
            ],
        },
        {
            networkid: 2,
            buffer: '#orangechat',
            messages: [
                {
                    time: Date.now(),
                    nick: 'prawnsalad',
                    message: 'boom boom boom',
                },
                {
                    time: Date.now() + 10000,
                    nick: 'someone',
                    message: '.. you want me in your room?',
                },
            ],
        }, */
    ],
};

// TODO: Move these state changing methods into vuex or something
const state = new Vue({
    data: stateObj,
    methods: {
        // Export enough state so that it can be imported in future to resume
        exportState: function exportState() {
            let toExport = {};

            toExport.networks = state.networks.map(network => {
                let networkObj = {
                    id: network.id,
                    name: network.name,
                    connection: {
                        server: network.connection.server,
                        port: network.connection.port,
                        tls: network.connection.tls,
                        path: network.connection.path,
                        password: network.connection.password,
                        direct: network.connection.direct,
                    },
                    settings: _.cloneDeep(network.settings),
                    nick: network.nick,
                    password: network.password,
                    buffers: [],
                };

                networkObj.buffers = network.buffers.map(buffer => {
                    let bufferObj = {
                        name: buffer.name,
                        joined: buffer.joined,
                        settings: _.cloneDeep(buffer.flags),
                    };

                    return bufferObj;
                });

                return networkObj;
            });

            return JSON.stringify(toExport);
        },

        // Import a previously exported state to continue that state
        importState: function importState(stateStr) {
            let importObj = JSON.parse(stateStr);
            if (importObj && importObj.networks) {
                this.resetState();
                importObj.networks.forEach(importNetwork => {
                    let network = createEmptyNetworkObject();
                    network.id = importNetwork.id;
                    network.name = importNetwork.name;
                    network.connection = importNetwork.connection;
                    network.settings = importNetwork.settings;
                    network.nick = importNetwork.nick;
                    network.password = importNetwork.password;

                    this.networks.push(network);
                    initialiseNetworkState(network);

                    importNetwork.buffers.forEach(importBuffer => {
                        let buffer = createEmptyBufferObject();
                        buffer.name = importBuffer.name;
                        buffer.networkid = network.id;
                        buffer.joined = importBuffer.joined;
                        buffer.settings = importBuffer.settings;

                        network.buffers.push(buffer);
                        initialiseBufferState(buffer);
                    });
                });
            }
        },

        resetState: function resetState() {
            this.$set(this.$data, 'networks', []);
            this.$set(this.$data, 'messages', []);
        },

        getActiveNetwork: function getActiveNetwork() {
            return this.getNetwork(this.ui.active_network);
        },

        getNetwork: function getNetwork(networkid) {
            let network = _.find(this.networks, {
                id: networkid,
            });

            return network;
        },

        addNetwork: function addNetwork(name, nick, serverInfo) {
            // Find the current largest ID and increment it by 1
            function networkidReduce(currentMax, network) {
                return network.id > currentMax ?
                    network.id :
                    currentMax;
            }
            let networkid = serverInfo.channelId ?
                parseInt(serverInfo.channelId, 10) :
                _.reduce(this.networks, networkidReduce, 0) + 1;

            let network = {
                id: networkid,
                name: name,
                state: 'disconnected',
                connection: {
                    server: serverInfo.server || '',
                    port: serverInfo.port || 6667,
                    tls: serverInfo.tls || false,
                    path: serverInfo.path || '',
                    password: serverInfo.password || '',
                    direct: serverInfo.direct,
                },
                settings: {},
                nick: nick,
                username: serverInfo.username,
                password: serverInfo.password,
                buffers: [],
                users: {},
            };

            if (serverInfo.services) {
                network.services = serverInfo.services;
            }

            this.networks.push(network);
            initialiseNetworkState(network);

            // Add the server server buffer
            this.addBuffer(network.id, '*').joined = true;

            return network;
        },

        removeNetwork: function removeNetwork(networkid) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            if (network.state === 'connected') {
                network.ircClient.quit();
            }

            if (network === this.getActiveNetwork()) {
                this.setActiveBuffer(null);
            }

            let idx = this.networks.indexOf(network);
            this.networks.splice(idx, 1);
        },

        getActiveBuffer: function getActiveBuffer() {
            return this.getBufferByName(this.ui.active_network, this.ui.active_buffer);
        },

        setActiveBuffer: function setActiveBuffer(networkid, bufferName) {
            if (!networkid) {
                this.ui.active_network = 0;
                this.ui.active_buffer = '';
            } else {
                this.ui.active_network = networkid;
                this.ui.active_buffer = bufferName;

                // Clear any unread messages counters for this buffer
                let buffer = this.getBufferByName(networkid, bufferName);
                if (buffer && buffer.flags.unread) {
                    buffer.flags.unread = 0;
                }
            }
        },

        getOrAddBufferByName: function getOrAddBufferByName(networkid, bufferName) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return null;
            }

            let buffer = _.find(network.buffers, {
                name: bufferName,
            });

            if (!buffer) {
                buffer = this.addBuffer(networkid, bufferName);
            }

            return buffer;
        },

        getBufferByName: function getBufferByName(networkid, bufferName) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return null;
            }

            let buffer = _.find(network.buffers, {
                name: bufferName,
            });

            return buffer;
        },

        addBuffer: function addBuffer(networkid, bufferName) {
            // If we already have this buffer, don't re-add it
            let buffer = this.getBufferByName(networkid, bufferName);
            if (buffer) {
                return buffer;
            }

            // Make sure we at least we have this network
            let network = this.getNetwork(networkid);
            if (!network) {
                return false;
            }

            buffer = createEmptyBufferObject();
            buffer.networkid = network.id;
            buffer.name = bufferName;
            network.buffers.push(buffer);

            initialiseBufferState(buffer);

            return buffer;
        },

        removeBuffer: function removeBuffer(buffer) {
            let isActiveBuffer = (this.getActiveBuffer() === buffer);

            let network = this.getNetwork(buffer.networkid);
            if (!network) {
                return;
            }

            let bufferIdx = network.buffers.indexOf(buffer);
            if (bufferIdx > -1) {
                network.buffers.splice(bufferIdx, 1);
            }

            let messages = this.getMessages(buffer);
            let messageIdx = this.messages.indexOf(messages);
            if (messageIdx > -1) {
                this.messages.splice(messageIdx, 1);
            }

            if (buffer.isChannel()) {
                network.ircClient.part(buffer.name);
            }

            if (isActiveBuffer) {
                this.setActiveBuffer(network.id, network.serverBuffer().name);
            }

            // Remove this buffer from any users
            buffer.users.forEach(user => delete user.buffers[buffer.id]);
        },

        addMessage: function addMessage(buffer, message) {
            let messages = _.find(this.messages, {
                networkid: buffer.networkid,
                buffer: buffer.name,
            });

            if (!messages) {
                return;
            }

            let bufferMessage = {
                time: message.time || Date.now(),
                nick: message.nick,
                message: message.message,
                type: message.type || 'message',
                type_extra: message.type_extra,
            };

            messages.messages.push(bufferMessage);

            // Increment the unread counter if this buffer is not active
            let includeAsActivity = true;
            if (!buffer.setting('traffic_as_activity') && message.type === 'traffic') {
                includeAsActivity = false;
            }

            let isActiveBuffer = (
                buffer.networkid === this.ui.active_network &&
                buffer.name === this.ui.active_buffer
            );

            if (includeAsActivity && !isActiveBuffer) {
                if (!buffer.flags.unread) {
                    this.$set(buffer.flags, 'unread', 1);
                } else {
                    buffer.flags.unread++;
                }
            }

            this.$emit('message.new', bufferMessage, buffer);
        },

        getMessages: function getMessages(buffer) {
            let messages = _.find(this.messages, {
                networkid: buffer.networkid,
                buffer: buffer.name,
            });

            return messages ?
                messages.messages :
                [];
        },

        getUser: function getUser(networkid, nick) {
            let user = null;
            let network = this.getNetwork(networkid);

            if (network) {
                user = network.users[nick.toLowerCase()];
            }

            return user;
        },

        addUser: function addUser(networkid, user) {
            let network = null;

            // Accept either a network ID or a direct network object
            if (typeof networkid === 'number') {
                network = this.getNetwork(networkid);
            } else {
                network = networkid;
            }

            if (!network) {
                return null;
            }

            let userObj = null;

            if (!network.users[user.nick.toLowerCase()]) {
                userObj = network.users[user.nick.toLowerCase()] = {
                    nick: user.nick,
                    host: user.host || '',
                    username: user.username || '',
                    modes: user.modes || '',
                    away: user.away || '',
                    buffers: Object.create(null),
                };
            } else {
                // Update the existing user object with any new info we have
                userObj = state.getUser(network.id, user.nick);
                _.each(user, (val, prop) => {
                    if (typeof val !== 'undefined') {
                        userObj[prop] = val;
                    }
                });
            }

            return userObj;
        },

        removeUser: function removeUser(networkid, user) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            let buffers = state.getBuffersWithUser(networkid, event.nick);
            buffers.forEach(buffer => {
                state.removeUserFromBuffer(buffer, event.nick);
            });

            this.$delete(network.users, user.nick);
        },

        addUserToBuffer: function addUserToBuffer(buffer, user, modes) {
            let network = this.getNetwork(buffer.networkid);
            let userObj = state.getUser(network.id, user.nick);

            if (!userObj) {
                // Using $set for vues reactivity is very slow when connecting to
                // a large BNC. We might not ever need full reactivity for the user
                // objects so just add a plain object for now.
                /*
                state.$set(network.users, user.nick, {
                    nick: user.nick,
                    host: user.host || '',
                    username: user.username || '',
                    modes: user.modes || '',
                });
                */
                userObj = this.addUser(network, user);
                //  console.log('Setting ' + user.nick + ' on ' +
                //    buffer.name, network.users[user.nick]);
            }

            if (buffer.users.indexOf(userObj) === -1) {
                buffer.users.push(userObj);
            }

            // Add the buffer to the users buffer list
            if (!userObj.buffers[buffer.id]) {
                state.$set(userObj.buffers, buffer.id, {
                    modes: modes || [],
                    buffer: buffer,
                });
            } else {
                state.$set(userObj.buffers[buffer.id], 'modes', modes || []);
            }
        },

        removeUserFromBuffer: function removeUserFromBuffer(buffer, nick) {
            let userObj = this.getUser(buffer.networkid, nick);
            let idx = buffer.users.indexOf(userObj);
            if (idx > -1) {
                buffer.users.splice(idx, 1);
            }

            delete userObj.buffers[buffer.id];
        },

        getBuffersWithUser: function getBuffersWithUser(networkid, nick) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return [];
            }

            let user = this.getUser(network.id, nick);
            if (!user) {
                return [];
            }

            let buffers = [];
            network.buffers.forEach(buffer => {
                if (buffer.users.indexOf(user) > -1) {
                    buffers.push(buffer);
                }
            });

            return buffers;
        },

        changeUserNick: function changeUserNick(networkid, oldNick, newNick) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            let user = state.getUser(network.id, oldNick);
            if (!user) {
                return;
            }

            user.nick = newNick;
            state.$set(network.users, newNick.toLowerCase(), network.users[oldNick]);
            state.$delete(network.users, oldNick.toLowerCase());
        },
    },
});

export default state;


function createEmptyNetworkObject() {
    return {
        id: 0,
        name: '',
        state: 'disconnected',
        connection: {
            server: '',
            port: 6667,
            tls: false,
            path: '',
            password: '',
            direct: false,
        },
        settings: {},
        nick: '',
        password: '',
        buffers: [],
        users: {},
    };
}

let nextBufferId = 0;
function createEmptyBufferObject() {
    return {
        id: nextBufferId++,
        networkid: 0,
        name: '',
        topic: '',
        joined: false,
        users: [],
        flags: {
            unread: 0,
            alert_on: 'default',
            has_opened: false,
            chathistory_available: true,
        },
        settings: {
        },
    };
}

function initialiseNetworkState(network) {
    Object.defineProperty(network, 'ircClient', {
        value: IrcClient.create(state, network.id),
    });
    Object.defineProperty(network, 'bufferByName', {
        value: _.partial(state.getBufferByName, network.id),
    });
    Object.defineProperty(network, 'serverBuffer', {
        value: _.partial(state.getBufferByName, network.id, '*'),
    });
    Object.defineProperty(network, 'setting', {
        value: function setting(name, val) {
            if (typeof val !== 'undefined') {
                state.$set(network.settings, name, val);
                return val;
            }

            return network.settings[name];
        },
    });

    // If this network is being imported from a stored state, make sure it is
    // now set as 'disconnected' as it will not connected at this point.
    network.state = 'disconnected';
}


function initialiseBufferState(buffer) {
    Object.defineProperty(buffer, 'getNetwork', {
        value: function getNetwork() { return state.getNetwork(buffer.networkid); },
    });
    Object.defineProperty(buffer, 'getMessages', {
        value: function getNetwork() { return state.getMessages(buffer); },
    });
    Object.defineProperty(buffer, 'isServer', {
        value: function isServer() { return buffer.name === '*'; },
    });
    Object.defineProperty(buffer, 'isChannel', {
        value: function isChannel() {
            let chanPrefixes = ['#', '&'];
            let ircNetwork = buffer.getNetwork().ircClient.network;
            if (ircNetwork && ircNetwork.options.CHANTYPES) {
                chanPrefixes = ircNetwork.options.CHANTYPES;
            }

            return chanPrefixes.indexOf(buffer.name[0]) > -1;
        },
    });
    Object.defineProperty(buffer, 'isQuery', {
        value: function isQuery() {
            // Internal buffer names
            let ignorePrefix = '*';
            let chanPrefixes = ['#', '&'];
            let ircNetwork = buffer.getNetwork().ircClient.network;
            if (ircNetwork && ircNetwork.options.CHANTYPES) {
                chanPrefixes = ircNetwork.options.CHANTYPES;
            }

            return chanPrefixes.indexOf(buffer.name[0]) === -1 && buffer.name[0] !== ignorePrefix;
        },
    });
    // Get/set a setting set on this buffer. If undefined, get the global setting
    Object.defineProperty(buffer, 'setting', {
        value: function setting(name, val) {
            if (typeof val !== 'undefined') {
                state.$set(buffer.settings, name, val);
                return val;
            }

            // Check the buffer specific settings before reverting to global settings
            let result = typeof buffer.settings[name] !== 'undefined' ?
                buffer.settings[name] :
                state.settings.buffers[name];

            return result;
        },
    });
    Object.defineProperty(buffer, 'requestScrollback', {
        value: function requestScrollback() {
            let time = '';
            let lastMessage = this.getMessages()[0];

            if (lastMessage) {
                time = strftime('%FT%T.000Z', new Date(lastMessage.time));
            } else {
                time = strftime('%FT%T.000Z', new Date());
            }

            let ircClient = this.getNetwork().ircClient;
            ircClient.raw(`CHATHISTORY ${this.name} ${time} 50`);
            ircClient.once('batch end chathistory', (event) => {
                if (event.commands.length === 0) {
                    this.flags.chathistory_available = false;
                } else {
                    this.flags.chathistory_available = true;
                }
            });
        },
    });

    state.messages.push({
        networkid: buffer.networkid,
        buffer: buffer.name,
        messages: [],
    });
}

