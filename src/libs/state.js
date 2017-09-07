import Vue from 'vue';
import _ from 'lodash';
import strftime from 'strftime';
import * as IrcClient from './IrcClient';
import Message from './Message';
import batchedAdd from './batchedAdd';
import * as Misc from 'src/helpers/Misc';

const stateObj = {
    // May be set by a StatePersistence instance
    persistence: null,

    // Settings may be overridden via config.json
    settings: {
        windowTitle: 'Kiwi IRC - The web IRC client',
        useMonospace: false,
        messageLayout: 'compact',
        theme: 'Default',
        themes: [
            { name: 'Default', url: 'static/themes/default' },
        ],
        // Restricted to a single IRC server
        restricted: true,
        // The startup screen
        startupScreen: 'customServer',
        // Where to find the kiwi server
        kiwiServer: '/webirc/kiwiirc/',
        // If active, all connections will be routed via this BNC server. Network settings
        // will be read and updated to the BNC as they are changed.
        bnc: {
            active: false,
            server: '',
            port: 6667,
            tls: false,
            username: '',
            password: '',
        },
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
            extra_formatting: true,
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
            state_key: 'kiwi-state',
        },
        showAutocomplete: true,
        aliases: `
# General aliases
/p /part $1+
/me /action $destination $1+
/j /join $1+
/q /query $1+
/w /whois $1+
/raw /quote $1+
/connect /server $1+
/cycle $channel? /lines /part $channel | /join $channel

# Op related aliases
/op /quote mode $channel +o $1+
/deop /quote mode $channel -o $1+
/hop /quote mode $channel +h $1+
/dehop /quote mode $channel -h $1+
/voice /quote mode $channel +v $1+
/devoice /quote mode $channel -v $1+
/k /kick $channel $1+
/ban /quote mode $channel +b $1+
/unban /quote mode $channel -b $1+

# Misc aliases
/slap /me slaps $1 around a bit with a large trout
/tick /msg $channel ✔`,
        embedly: {
            Key: '',
        },
    },
    user_settings: {
    },
    connection: {
        // disconnected / connecting / connected
        status: 'connected',
        sessionId: '',
    },
    ui: {
        active_network: 0,
        active_buffer: '',
        app_has_focus: true,
    },
    networks: [
        /* {
            id: 1,
            name: 'sumnetwork',
            state: 'disconnected',
            state_error: '',
            connection: {
                server: 'irc.freenode.net',
                port: 6667,
                tls: false,
                password: ''
            },
            nick: 'prawnsalad',
            username: 'prawn',
            settings: { show_raw: false },
            auto_commands: '',
            is_znc: false,
            channel_list: [],
            channel_list_state: '',
            buffers: [
                {
                    id: 0,
                    networkid: 1,
                    name: '#kiwiirc',
                    topic: 'A hand-crafted IRC client',
                    joined: true,
                    flags: { unread: 4, highlight: true },
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
};

// Messages are seperate from the above state object to keep them from being reactive. Saves CPU.
const messages = [
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
];

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
                        encoding: network.connection.encoding,
                    },
                    auto_commands: network.auto_commands,
                    settings: _.cloneDeep(network.settings),
                    nick: network.nick,
                    username: network.username,
                    password: network.password,
                    buffers: [],
                };

                networkObj.buffers = network.buffers.map(buffer => {
                    let bufferObj = {
                        name: buffer.name,
                        key: buffer.key,
                        enabled: !!buffer.enabled,
                        settings: _.cloneDeep(buffer.settings),
                    };

                    return bufferObj;
                });

                return networkObj;
            });

            toExport.user_settings = state.user_settings;

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
                    network.auto_commands = importNetwork.auto_commands || '';
                    network.settings = importNetwork.settings;
                    network.nick = importNetwork.nick;
                    network.username = importNetwork.username;
                    network.password = importNetwork.password;

                    this.networks.push(network);
                    initialiseNetworkState(network);

                    importNetwork.buffers.forEach(importBuffer => {
                        let buffer = createEmptyBufferObject();
                        buffer.name = importBuffer.name;
                        buffer.key = importBuffer.key;
                        buffer.networkid = network.id;
                        buffer.enabled = !!importBuffer.enabled;
                        buffer.settings = importBuffer.settings;

                        network.buffers.push(buffer);
                        initialiseBufferState(buffer);
                    });
                });
            }

            if (importObj && importObj.user_settings) {
                this.user_settings = importObj.user_settings;
            }
        },

        resetState: function resetState() {
            this.$set(this.$data, 'networks', []);
            this.$set(this.$data, 'messages', []);
        },

        setting: function setting(name, val) {
            if (typeof val !== 'undefined') {
                // Setting any setting always goes into the user own settings space
                return this.setSetting('user_settings.' + name, val);
            }

            // Check the user specific settings before reverting to global settings
            let userSetting = this.getSetting('user_settings.' + name);
            let result = typeof userSetting !== 'undefined' ?
                userSetting :
                this.getSetting('settings.' + name);

            return result;
        },

        // Accept 'dotted.notation' to read a state property of any depth
        getSetting: function getSetting(name) {
            let parts = name.split('.');
            let val = this.$data;

            for (let i = 0; i < parts.length; i++) {
                val = val[parts[i]];
                if (typeof val === 'undefined') {
                    break;
                }
            }

            return val;
        },

        // Accept 'dotted.notation' to set a state property of any depth
        setSetting: function setSetting(name, newVal) {
            let parts = name.split('.');
            let val = this.$data;

            for (let i = 0; i < parts.length; i++) {
                let propName = parts[i];
                let nextVal = val[propName];

                if (i < parts.length - 1 && typeof nextVal === 'undefined') {
                    nextVal = this.$set(val, propName, {});
                } else if (i === parts.length - 1) {
                    this.$set(val, propName, newVal);
                }

                val = nextVal;
            }

            return val;
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

            let network = createEmptyNetworkObject();
            network.id = networkid;
            network.name = name;
            network.nick = nick;
            network.username = serverInfo.username;
            network.password = serverInfo.password;
            network.connection.server = serverInfo.server || '';
            network.connection.port = serverInfo.port || 6667;
            network.connection.tls = serverInfo.tls || false;
            network.connection.path = serverInfo.path || '';
            network.connection.password = serverInfo.password || '';
            network.connection.direct = !!serverInfo.direct;
            network.connection.encoding = serverInfo.encoding || 'utf8';
            network.connection.bncname = serverInfo.bncname || '';

            if (serverInfo.services) {
                network.services = serverInfo.services;
            }

            this.networks.push(network);
            initialiseNetworkState(network);

            // Add the server server buffer
            this.addBuffer(network.id, '*').joined = true;

            let eventObj = { network };
            state.$emit('network.new', eventObj);

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

            let eventObj = { network };
            state.$emit('network.removed', eventObj);
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

                // Update the buffers last read time
                buffer.markAsRead(true);
            }
        },

        updateBufferLastRead: function updateBufferLastRead(networkid, bufferName) {
            let buffer = this.getBufferByName(networkid, bufferName);
            if (buffer) {
                buffer.last_read = Date.now();
                buffer.active_timeout = null;
            }
        },

        getOrAddBufferByName: function getOrAddBufferByName(networkid, bufferName) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return null;
            }

            let toMatch = bufferName.toLowerCase();
            let buffer = _.find(network.buffers, b => b.name.toLowerCase() === toMatch);

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

            let toMatch = bufferName.toLowerCase();
            let buffer = _.find(network.buffers, b => b.name.toLowerCase() === toMatch);

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

            let eventObj = { buffer };
            state.$emit('buffer.new', eventObj);

            return buffer;
        },

        removeBuffer: function removeBuffer(buffer) {
            let isActiveBuffer = (this.getActiveBuffer() === buffer);

            let network = this.getNetwork(buffer.networkid);
            if (!network) {
                return;
            }

            let eventObj = { buffer };
            state.$emit('buffer.close', eventObj);

            let bufferIdx = network.buffers.indexOf(buffer);
            if (bufferIdx > -1) {
                network.buffers.splice(bufferIdx, 1);
            }

            let messageIdx = _.findIndex(messages, {
                networkid: network.id,
                buffer: buffer.name,
            });
            if (messageIdx > -1) {
                messages.splice(messageIdx, 1);
            }

            if (buffer.isChannel() && buffer.joined) {
                network.ircClient.part(buffer.name);
            }

            if (isActiveBuffer) {
                this.setActiveBuffer(network.id, network.serverBuffer().name);
            }

            // Remove this buffer from any users
            /* eslint-disable guard-for-in */
            for (let nick in buffer.users) {
                let user = buffer.users[nick];
                delete user.buffers[buffer.id];
            }
        },

        addMessage: function addMessage(buffer, message) {
            let user = this.getUser(buffer.networkid, message.nick);
            let bufferMessage = new Message(message, user);
            if (user && user.ignore) {
                bufferMessage.ignore = true;
            }

            buffer.addMessage(bufferMessage);

            // Increment the unread counter if this buffer is not active
            let includeAsActivity = false;
            let typesForActivty = ['privmsg', 'action', 'notice'];
            if (buffer.setting('traffic_as_activity') && message.type === 'traffic') {
                typesForActivty.push('traffic');
            }

            if (typesForActivty.indexOf(message.type) > -1) {
                includeAsActivity = true;
            }

            let isActiveBuffer = (
                buffer.networkid === this.ui.active_network &&
                buffer.name === this.ui.active_buffer
            );

            if (isActiveBuffer && state.ui.app_has_focus) {
                buffer.last_read = message.time;
            }

            if (includeAsActivity && !isActiveBuffer) {
                buffer.incrementFlag('unread');
                let network = buffer.getNetwork();
                if (Misc.mentionsNick(bufferMessage.message, network.ircClient.user.nick)) {
                    buffer.flag('highlight', true);
                }
            }

            this.$emit('message.new', bufferMessage, buffer);
        },

        getMessages: function getMessages(buffer) {
            let bufMessages = _.find(messages, {
                networkid: buffer.networkid,
                buffer: buffer.name,
            });

            return bufMessages ?
                bufMessages.messages :
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

        // Modify a networks user array without hitting vues reactive system until fn()
        // has completed. Good for making large changes in bulk
        usersTransaction: function usersTransaction(networkid, fn) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            let users = _.clone(network.users);
            fn(users);
            this.$set(network, 'users', users);
        },

        addUser: function addUser(networkid, user, usersArr_) {
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

            let usersArr = usersArr_ || network.users;
            let userObj = null;

            if (!usersArr[user.nick.toLowerCase()]) {
                userObj = usersArr[user.nick.toLowerCase()] = {
                    nick: user.nick,
                    host: user.host || '',
                    username: user.username || '',
                    realname: user.realname || '',
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

            let buffers = state.getBuffersWithUser(networkid, user.nick);
            buffers.forEach(buffer => {
                state.removeUserFromBuffer(buffer, user.nick);
            });

            this.$delete(network.users, user.nick.toLowerCase());
        },

        addMultipleUsersToBuffer: function addMultipleUsersToBuffer(buffer, newUsers) {
            let network = this.getNetwork(buffer.networkid);
            let bufUsers = _.clone(buffer.users);

            state.usersTransaction(network.id, users => {
                newUsers.forEach(newUser => {
                    let user = newUser.user;
                    let modes = newUser.modes;
                    let userObj = state.getUser(network.id, user.nick);

                    if (!userObj) {
                        userObj = this.addUser(network, user, users);
                    }
                    bufUsers[userObj.nick.toLowerCase()] = userObj;

                    // Add the buffer to the users buffer list
                    if (!userObj.buffers[buffer.id]) {
                        userObj.buffers[buffer.id] = {
                            modes: modes || [],
                            buffer: buffer,
                        };
                    } else {
                        userObj.buffers[buffer.id].modes = modes || [];
                    }
                });
            });

            buffer.users = bufUsers;
        },

        addUserToBuffer: function addUserToBuffer(buffer, user, modes) {
            let network = this.getNetwork(buffer.networkid);
            let userObj = state.getUser(network.id, user.nick);

            if (!userObj) {
                userObj = this.addUser(network, user);
            }

            buffer.addUser(userObj);

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
            buffer.removeUser(nick);
        },

        getBuffersWithUser: function getBuffersWithUser(networkid, nick) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return [];
            }

            let normalisedNick = nick.toLowerCase();
            let buffers = [];
            network.buffers.forEach(buffer => {
                if (buffer.users[normalisedNick]) {
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

            let normalisedNew = newNick.toLowerCase();
            let normalisedOld = oldNick.toLowerCase();

            user.nick = newNick;
            state.$set(network.users, normalisedNew, network.users[normalisedOld]);
            state.$delete(network.users, normalisedOld);

            for (let bufferId in user.buffers) {
                let buffer = user.buffers[bufferId].buffer;
                state.$set(buffer.users, normalisedNew, buffer.users[normalisedOld]);
                state.$delete(buffer.users, normalisedOld);
            }
        },
    },
});

export default state;


function createEmptyNetworkObject() {
    return {
        id: 0,
        name: '',
        state: 'disconnected',
        state_error: '',
        auto_commands: '',
        is_znc: false,
        channel_list: [],
        channel_list_state: '',
        connection: {
            server: '',
            port: 6667,
            tls: false,
            path: '',
            password: '',
            direct: false,
            encoding: 'utf8',
            bncname: '',
        },
        settings: {},
        nick: '',
        username: '',
        password: '',
        buffers: [],
        users: Object.create(null),
    };
}

let nextBufferId = 0;
function createEmptyBufferObject() {
    return {
        id: nextBufferId++,
        networkid: 0,
        name: '',
        topic: '',
        key: '',
        joined: false,
        enabled: true,
        users: Object.create(null),
        modes: Object.create(null),
        flags: {
            unread: 0,
            alert_on: 'default',
            has_opened: false,
            chathistory_available: true,
        },
        settings: {
        },
        last_read: Date.now(),
        active_timeout: null,
        message_count: 0,
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
    Object.defineProperty(network, 'isChannelName', {
        value: function isChannelName(input) {
            if (typeof input !== 'string' || !input) {
                return false;
            }

            let chanPrefixes = this.ircClient.network.supports('CHANTYPES') || '#&';
            return chanPrefixes.indexOf(input[0]) > -1;
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
            let chanPrefixes = ['#', '&'];
            let ircNetwork = buffer.getNetwork().ircClient.network;
            if (ircNetwork && ircNetwork.options.CHANTYPES) {
                chanPrefixes = ircNetwork.options.CHANTYPES;
            }

            return chanPrefixes.indexOf(buffer.name[0]) === -1 && !this.isSpecial();
        },
    });
    Object.defineProperty(buffer, 'isSpecial', {
        value: function isSpecial() {
            // Special buffer names (Usually controller queries, like *status or *raw)
            let name = buffer.name;
            return name[0] === '*' && name.length > 1;
        },
    });
    Object.defineProperty(buffer, 'isUserAnOp', {
        value: function isUserAnOp(nick) {
            let user = state.getUser(buffer.networkid, buffer.getNetwork().nick);
            if (!user) {
                return false;
            }

            let userBufferInfo = user.buffers[buffer.id];
            if (!userBufferInfo) {
                return false;
            }

            let modes = userBufferInfo.modes;
            let opModes = ['Y', 'y', 'q', 'a', 'o', 'h'];
            let hasOp = _.find(modes, mode => opModes.indexOf(mode.toLowerCase()) > -1);

            return !!hasOp;
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
                state.setting('buffers.' + name);

            return result;
        },
    });
    Object.defineProperty(buffer, 'flag', {
        value: function flag(name, val) {
            if (typeof val !== 'undefined') {
                state.$set(buffer.flags, name, val);
                return val;
            }

            return buffer.flags[name];
        },
    });
    Object.defineProperty(buffer, 'requestScrollback', {
        value: function requestScrollback() {
            let time = '';
            let lastMessage = this.getMessages().reduce((earliest, current) => {
                if (earliest.time && earliest.time < current.time) {
                    return earliest;
                }
                return current;
            }, this.getMessages()[0]);

            if (lastMessage) {
                time = strftime('%FT%T.%L%:z', new Date(lastMessage.time));
            } else {
                time = strftime('%FT%T.%L%:z', new Date());
            }

            let ircClient = this.getNetwork().ircClient;
            ircClient.raw(`CHATHISTORY ${this.name} timestamp=${time} message_count=50`);
            ircClient.once('batch end chathistory', (event) => {
                if (event.commands.length === 0) {
                    this.flags.chathistory_available = false;
                } else {
                    this.flags.chathistory_available = true;
                }
            });
        },
    });
    Object.defineProperty(buffer, 'markAsRead', {
        value: function markAsRead(delayed) {
            if (buffer.active_timeout) {
                clearTimeout(buffer.active_timeout);
                buffer.active_timeout = null;
            }
            if (delayed) {
                buffer.active_timeout = setTimeout(
                    buffer.markAsRead,
                    10000,
                    false
                );
            } else {
                buffer.last_read = Date.now();
                buffer.flag('highlight', false);
            }
        },
    });

    // incrementFlag batches up the changes to the flags object as some of them can be
    // very taxing on DOM updates
    Object.defineProperty(buffer, 'incrementFlag', {
        value: (function incrementFlagFn() {
            let batches = Object.create(null);
            let processBatches = _.debounce(() => {
                _.each(batches, (incrBy, flagName) => {
                    buffer.flags[flagName] = (buffer.flags[flagName] || 0) + incrBy;
                    batches[flagName] = 0;
                });
            }, 500);
            return function incrementFlag(flagName) {
                batches[flagName] = batches[flagName] || 0;
                batches[flagName]++;
                processBatches();
            };
        }()),
    });


    /**
     * Batch up floods of addUsers for a huge performance gain.
     * Generally happens whenr econnecting to a BNC
     */
    function addSingleUser(user) {
        state.$set(buffer.users, user.nick.toLowerCase(), user);
    }
    function addMultipleUsers(users) {
        let o = _.clone(buffer.users);
        users.forEach(user => {
            o[user.nick.toLowerCase()] = user;
        });
        buffer.users = o;
    }
    Object.defineProperty(buffer, 'addUser', {
        value: batchedAdd(addSingleUser, addMultipleUsers),
    });
    Object.defineProperty(buffer, 'removeUser', {
        value: function removeUser(nick) {
            let userObj = state.getUser(buffer.networkid, nick);

            // A user could be queued to be added, so make sure it's not there as it
            // would just be added again. Eg. user joins/parts during a flood
            _.pull(buffer.addUser.queue(), userObj);

            state.$delete(buffer.users, nick.toLowerCase());

            if (userObj) {
                delete userObj.buffers[buffer.id];
            }
        },
    });

    /**
     * batch up floods of new messages for a huge performance gain
     */
    function addSingleMessage(newMessage) {
        messageObj.messages.push(newMessage);
        buffer.message_count = messageObj.messages.length;
    }
    function addMultipleMessages(newMessages) {
        messageObj.messages = messageObj.messages.concat(newMessages);
        buffer.message_count = messageObj.messages.length;
    }
    Object.defineProperty(buffer, 'addMessage', {
        value: batchedAdd(addSingleMessage, addMultipleMessages),
    });

    let messageObj = {
        networkid: buffer.networkid,
        buffer: buffer.name,
        messages: [],
    };
    messages.push(messageObj);
}
