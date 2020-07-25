'kiwi public';

import * as Misc from '@/helpers/Misc';
import Vue from 'vue';
import _ from 'lodash';
import { configTemplates } from '@/res/configTemplates';
import NetworkState from './state/NetworkState';
import BufferState from './state/BufferState';
import UserState from './state/UserState';
import Message from './Message';

function createNewState() {
    const stateObj = {
        // May be set by a StatePersistence instance
        persistence: null,

        // Settings may be overridden via config.json
        settings: configTemplates.default,
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
            last_active_buffers: [],
            app_has_focus: true,
            app_width: 0,
            app_height: 0,
            is_touch: false,
            is_narrow: false,
            favicon_counter: 0,
            current_input: '',
            input_history: [],
            input_history_pos: 0,
            show_advanced_tab: false,
        },
        networks: [],
    };

    const userDict = new Vue({
        data() {
            return {
                networks: {},
            };
        },
        /*
        (network id): {
            (lowercase nick): UserState,
            (lowercase nick): UserState,
        },
        */
    });

    const bufferDict = new Vue({
        data() {
            return {
                networks: {},
            };
        },
        /*
        (network id): [
            BufferState,
            BufferState,
        ]
        */
    });

    // Messages are seperate from the above state object to keep them from being reactive. Saves CPU
    const messages = [
        /* {
            networkid: 1,
            buffer: '#kiwiirc',
            messages: [
                Message,
                Message
            ],
        }, */
    ];

    const availableStartups = Object.create(null);

    const state = new Vue({
        data: stateObj,
        methods: {
            // Export enough state so that it can be imported in future to resume
            exportState(includeBuffers) {
                let toExport = {};

                if (includeBuffers) {
                    toExport.networks = state.networks.map((network) => {
                        let networkObj = {
                            id: network.id,
                            name: network.name,
                            connection: {
                                nick: network.connection.nick,
                                server: network.connection.server,
                                port: network.connection.port,
                                tls: network.connection.tls,
                                path: network.connection.path,
                                password: network.connection.password,
                                direct: network.connection.direct,
                                encoding: network.connection.encoding,
                                bncnetid: network.connection.bncnetid,
                            },
                            auto_commands: network.auto_commands,
                            settings: _.cloneDeep(network.settings),
                            username: network.username,
                            gecos: network.gecos,
                            password: network.password,
                            hidden: network.hidden,
                            is_bnc: network.is_bnc,
                            buffers: [],
                        };

                        networkObj.buffers = network.buffers.map((buffer) => {
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
                }

                toExport.user_settings = state.user_settings;

                return JSON.stringify(toExport);
            },

            // Import a previously exported state to continue that state
            importState(stateStr) {
                let importObj = JSON.parse(stateStr);
                if (importObj && importObj.networks) {
                    this.resetState();
                    importObj.networks.forEach((importNetwork) => {
                        let network = new NetworkState(
                            importNetwork.id,
                            state,
                            userDict,
                            bufferDict
                        );
                        network.name = importNetwork.name;
                        network.connection = { ...network.connection, ...importNetwork.connection };
                        network.auto_commands = importNetwork.auto_commands || '';
                        network.settings = importNetwork.settings;
                        // First check importNetwork.nick as this was used in older versions
                        // TODO: Eventually remove this importNetwork.nick check
                        network.nick = importNetwork.nick || importNetwork.connection.nick;
                        if (!network.connection.nick && importNetwork.nick) {
                            network.connection.nick = importNetwork.nick;
                        }
                        network.username = importNetwork.username;
                        network.gecos = importNetwork.gecos;
                        network.password = importNetwork.password;
                        network.hidden = importNetwork.hidden;
                        network.is_bnc = importNetwork.is_bnc;

                        this.networks.push(network);

                        importNetwork.buffers.forEach((impBuffer) => {
                            let buffer = new BufferState(
                                impBuffer.name,
                                network.id,
                                state,
                                messages
                            );
                            buffer.key = impBuffer.key;
                            buffer.enabled = !!impBuffer.enabled;
                            buffer.settings = impBuffer.settings;

                            network.buffers.push(buffer);
                        });
                    });
                }

                if (importObj && importObj.user_settings) {
                    this.user_settings = importObj.user_settings;
                }
            },

            resetState() {
                this.$set(this.$data, 'user_settings', {});
                this.$set(this.$data, 'networks', []);
                messages.splice(0);
            },

            setting(name, val) {
                if (typeof val !== 'undefined') {
                    if (val === this.getSetting('settings.' + name)) {
                        // Remove setting from user_settings if its the default
                        return this.setSetting('user_settings.' + name, null);
                    }
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
            getSetting(name) {
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
            setSetting(name, newVal) {
                let parts = name.split('.');
                let val = this.$data;

                for (let i = 0; i < parts.length; i++) {
                    let propName = parts[i];
                    let nextVal = val[propName];

                    if (i < parts.length - 1 && typeof nextVal === 'undefined') {
                        nextVal = this.$set(val, propName, {});
                    } else if (i === parts.length - 1) {
                        if (newVal === null) {
                            this.$delete(val, propName);
                        } else {
                            this.$set(val, propName, newVal);
                        }
                    }

                    val = nextVal;
                }

                return val;
            },

            getActiveNetwork() {
                return this.getNetwork(this.ui.active_network);
            },

            getNetwork(networkid) {
                let network = _.find(this.networks, {
                    id: networkid,
                });

                return network;
            },

            getNetworkFromAddress(netAddr) {
                return _.find(this.networks, (net) => {
                    let isMatch = netAddr.toLowerCase() === net.connection.server.toLowerCase();
                    return isMatch;
                });
            },

            getNetworkFromBncNetId(bncnetid) {
                return _.find(this.networks, (net) => bncnetid === net.connection.bncnetid);
            },

            addNetwork(name, nick, serverInfo) {
                // Find the current largest ID and increment it by 1
                function networkidReduce(currentMax, network) {
                    return network.id > currentMax ?
                        network.id :
                        currentMax;
                }
                let networkid = serverInfo.channelId ?
                    parseInt(serverInfo.channelId, 10) :
                    _.reduce(this.networks, networkidReduce, 0) + 1;

                let network = new NetworkState(networkid, state, userDict, bufferDict);
                network.name = name;
                network.username = serverInfo.username;
                network.gecos = serverInfo.gecos;
                network.password = serverInfo.account_password || '';
                network.connection.password = serverInfo.password;
                network.connection.nick = nick;
                network.connection.server = serverInfo.server || '';
                network.connection.port = serverInfo.port || 6667;
                network.connection.tls = serverInfo.tls || false;
                network.connection.path = serverInfo.path || '';
                network.connection.direct = !!serverInfo.direct;
                network.connection.path = serverInfo.path || '';
                network.connection.encoding = serverInfo.encoding || 'utf8';
                network.connection.bncnetid = serverInfo.bncnetid || '';

                if (serverInfo.services) {
                    network.services = serverInfo.services;
                }

                this.networks.push(network);

                // Add the server server buffer
                this.addBuffer(network.id, '*').joined = true;

                let eventObj = { network };
                state.$emit('network.new', eventObj);

                return network;
            },

            removeNetwork(networkid) {
                let network = this.getNetwork(networkid);
                if (!network) {
                    return;
                }

                if (network.state === 'connected') {
                    network.ircClient.quit();
                }

                while (network.buffers.length > 0) {
                    this.removeBuffer(network.buffers[0]);
                }

                let findNewNetwork = false;
                if (network === this.getActiveNetwork()) {
                    findNewNetwork = true;
                }

                let idx = this.networks.indexOf(network);
                this.networks.splice(idx, 1);

                if (findNewNetwork) {
                    this.openLastActiveBuffer();
                }

                let eventObj = { network };
                state.$emit('network.removed', eventObj);
            },

            getActiveBuffer() {
                return this.getBufferByName(this.ui.active_network, this.ui.active_buffer);
            },

            setActiveBuffer(networkid, bufferName) {
                if (!networkid) {
                    this.ui.active_network = 0;
                    this.ui.active_buffer = '';
                } else {
                    if (this.ui.active_network) {
                        // Keep track of last 20 viewed buffers. When closing buffers we can go back
                        // to one of the previous ones
                        this.ui.last_active_buffers.push({
                            networkid: this.ui.active_network,
                            bufferName: this.ui.active_buffer,
                        });

                        let lastActive = this.ui.last_active_buffers;
                        this.ui.last_active_buffers = lastActive.splice(lastActive.length - 20);
                    }

                    this.ui.active_network = networkid;
                    this.ui.active_buffer = bufferName;

                    // Clear any unread messages counters for this buffer
                    let buffer = this.getBufferByName(networkid, bufferName);
                    if (buffer && buffer.flags.unread) {
                        buffer.flags.unread = 0;
                    }

                    // Update the buffers last read time
                    if (buffer) {
                        buffer.markAsRead(true);
                    }
                }
            },

            openLastActiveBuffer: function openLastActiveBuffer() {
                let targetNetwork;
                let targetBuffer;
                let lastActive = this.ui.last_active_buffers;

                // Find the last buffer in our history that still exists
                for (let i = lastActive.length - 1; i >= 0; i--) {
                    let network = this.getNetwork(lastActive[i].networkid);
                    if (!network) {
                        continue;
                    }

                    let buffer = network.bufferByName(lastActive[i].bufferName);
                    if (!buffer) {
                        continue;
                    }

                    targetNetwork = network;
                    targetBuffer = buffer;

                    // Trim the buffer history to this point
                    lastActive.splice(i);
                    break;
                }

                // Try to find a suitable buffer
                if (!targetBuffer) {
                    let network = this.getActiveNetwork() || this.networks[0];
                    if (network) {
                        targetNetwork = network;
                        let buffer = network.buffers[1];
                        if (buffer) {
                            targetBuffer = buffer;
                        } else {
                            targetBuffer = network.serverBuffer();
                        }
                    }
                }

                if (targetBuffer) {
                    this.setActiveBuffer(targetNetwork.id, targetBuffer.name);
                } else {
                    this.setActiveBuffer();
                }
            },

            updateBufferLastRead(networkid, bufferName) {
                let buffer = this.getBufferByName(networkid, bufferName);
                if (buffer) {
                    buffer.last_read = Date.now();
                    buffer.active_timeout = null;
                }
            },

            getOrAddBufferByName(networkid, bufferName) {
                let network = this.getNetwork(networkid);
                if (!network) {
                    return null;
                }

                let toMatch = bufferName.toLowerCase();
                let buffer = _.find(network.buffers, (b) => b.name.toLowerCase() === toMatch);

                if (!buffer) {
                    buffer = this.addBuffer(networkid, bufferName);
                }

                return buffer;
            },

            getBufferByName(networkid, bufferName) {
                if (!bufferName) {
                    return null;
                }

                let network = this.getNetwork(networkid);
                if (!network) {
                    return null;
                }

                let toMatch = bufferName.toLowerCase();
                let buffer = _.find(network.buffers, (b) => b.name.toLowerCase() === toMatch);

                return buffer;
            },

            addBuffer(networkid, bufferName) {
                if (!bufferName) {
                    return false;
                }

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

                buffer = new BufferState(bufferName, network.id, state, messages);
                network.buffers.push(buffer);

                let eventObj = { buffer };
                state.$emit('buffer.new', eventObj);

                return buffer;
            },

            removeBuffer(buffer) {
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

                // Remove the user from network state if no remaining common channels
                if (buffer.isQuery()) {
                    let remainingBuffers = state.getBuffersWithUser(network.id, buffer.name);
                    if (remainingBuffers.length === 0) {
                        state.removeUser(network.d, {
                            nick: buffer.name,
                        });
                    }
                }

                if (isActiveBuffer) {
                    this.openLastActiveBuffer();
                }

                // Remove this buffer from any users
                /* eslint-disable guard-for-in */
                Object.keys(buffer.users).forEach((nick) => {
                    let user = buffer.users[nick];
                    delete user.buffers[buffer.id];
                });
            },

            addMessage(buffer, message) {
                // Some messages try to be added after a network has been removed, meaning no buffer
                // will be available
                if (!buffer || !buffer.getNetwork()) {
                    return;
                }

                let user = this.getUser(buffer.networkid, message.nick);
                let bufferMessage = new Message(message, user);
                if (user && user.ignore) {
                    bufferMessage.ignore = true;
                }

                buffer.addMessage(bufferMessage);

                // Increment the unread counter if this buffer is not active
                let includeAsActivity = false;
                let typesForActivty = ['privmsg', 'action', 'notice', 'wallops'];
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

                let network = buffer.getNetwork();
                let isNewMessage = message.time >= buffer.last_read;
                let isHighlight = !network ?
                    false :
                    Misc.mentionsNick(bufferMessage.message, network.ircClient.user.nick);

                // Check for extra custom highlight words
                let extraHighlights = (state.setting('highlights') || '').toLowerCase().split(' ');
                if (!isHighlight && extraHighlights.length > 0) {
                    extraHighlights.forEach((word) => {
                        if (!word) {
                            return;
                        }

                        if (bufferMessage.message.toLowerCase().indexOf(word) > -1) {
                            isHighlight = true;
                        }
                    });
                }

                if (state.setting('teamHighlights')) {
                    let m = bufferMessage.message;
                    let patterns = {
                        everyone: /(^|\s)@everybody($|\s|[,.;])/,
                        channel: /(^|\s)@channel($|\s|[,.;])/,
                        here: /(^|\s)@here($|\s|[,.;])/,
                    };
                    if (m.match(patterns.everyone) || m.match(patterns.channel)) {
                        isHighlight = true;
                    }

                    if (m.match(patterns.here) && network && !network.away) {
                        isHighlight = true;
                    }
                }

                bufferMessage.isHighlight = isHighlight;

                if (isNewMessage && isActiveBuffer && state.ui.app_has_focus) {
                    buffer.last_read = message.time;
                }

                // Handle buffer flags
                if (isNewMessage && includeAsActivity && !isActiveBuffer && !bufferMessage.ignore) {
                    buffer.incrementFlag('unread');
                    if (isHighlight) {
                        buffer.flag('highlight', true);
                    }
                }

                // Handle any notifications
                let settingAlertOn = buffer.setting('alert_on');
                let isSelf = !network ? false : message.nick === network.nick;
                if (
                    isNewMessage &&
                    settingAlertOn !== 'never' &&
                    message.type !== 'nick' &&
                    message.type !== 'mode' &&
                    message.type !== 'traffic' &&
                    !buffer.isSpecial() &&
                    !bufferMessage.ignore &&
                    !isSelf
                ) {
                    let notifyTitle = '';
                    let notifyMessage = message.nick ?
                        message.nick + ': ' :
                        '';
                    notifyMessage += message.message;

                    if (isHighlight) {
                        notifyTitle = 'You were mentioned in ' + buffer.name;
                    } else if (settingAlertOn === 'message' && !isHighlight) {
                        notifyTitle = buffer.name;
                    }

                    if (notifyTitle) {
                        this.$emit('notification.show', notifyMessage, {
                            title: notifyTitle,
                            onclick: () => {
                                state.setActiveBuffer(buffer.networkid, buffer.name);

                                // Newer webkit browser use parent.focus() while older webkit uses
                                // window.focus()
                                /* eslint-disable no-restricted-globals */
                                if (parent && parent.focus) {
                                    parent.focus();
                                }
                                if (window.focus) {
                                    window.focus();
                                }
                            },
                        });
                    }
                }

                if (
                    isActiveBuffer &&
                    !state.ui.app_has_focus &&
                    message.type !== 'traffic' &&
                    (
                        (buffer.setting('flash_title') === 'message') ||
                        (buffer.setting('flash_title') === 'highlight' && isHighlight)
                    )
                ) {
                    this.$emit('notification.title', true);
                }

                this.$emit('message.new', { message: bufferMessage, buffer });
            },

            getUser(networkid, nick, usersArr_) {
                let user = null;
                let users = usersArr_;

                if (!users) {
                    let network = this.getNetwork(networkid);
                    if (network) {
                        users = network.users;
                    }
                }

                if (users) {
                    user = users[nick.toLowerCase()];
                }

                return user;
            },

            // Modify a networks user array without hitting vues reactive system until fn()
            // has completed. Good for making large changes in bulk
            usersTransaction(networkid, fn) {
                let network = this.getNetwork(networkid);
                if (!network) {
                    return;
                }

                let users = _.clone(network.users);
                fn(users);
                network.users = users;
            },

            addUser(networkid, user, usersArr_) {
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
                    userObj = usersArr[user.nick.toLowerCase()] = new UserState(user);
                } else {
                    // Update the existing user object with any new info we have
                    userObj = state.getUser(network.id, user.nick, usersArr);
                    _.each(user, (val, prop) => {
                        if (typeof val !== 'undefined') {
                            userObj[prop] = val;
                        }
                    });
                }

                return userObj;
            },

            removeUser(networkid, user) {
                let network = this.getNetwork(networkid);
                if (!network) {
                    return;
                }

                let buffers = state.getBuffersWithUser(networkid, user.nick);
                buffers.forEach((buffer) => {
                    state.removeUserFromBuffer(buffer, user.nick);
                });

                this.$delete(network.users, user.nick.toLowerCase());
            },

            addMultipleUsersToBuffer(buffer, newUsers) {
                let network = this.getNetwork(buffer.networkid);
                let bufUsers = _.clone(buffer.users);

                state.usersTransaction(network.id, (users) => {
                    newUsers.forEach((newUser) => {
                        let user = newUser.user;
                        let modes = newUser.modes;
                        let userObj = state.getUser(network.id, user.nick, users);

                        if (!userObj) {
                            userObj = this.addUser(network, user, users);
                        }
                        bufUsers[userObj.nick.toLowerCase()] = userObj;

                        // Add the buffer to the users buffer list
                        if (!userObj.buffers[buffer.id]) {
                            state.$set(userObj.buffers, buffer.id, {
                                modes: modes || [],
                                buffer: buffer,
                            });
                        } else {
                            userObj.buffers[buffer.id].modes = modes || [];
                        }
                    });
                });

                buffer.users = bufUsers;
            },

            addUserToBuffer(buffer, user, modes) {
                let network = this.getNetwork(buffer.networkid);
                let userObj = state.getUser(network.id, user.nick);

                if (!userObj) {
                    userObj = this.addUser(network, user);
                } else {
                    // Verify the user object is correct
                    _.each(user, (val, prop) => {
                        if (userObj[prop] !== val) {
                            userObj[prop] = val;
                        }
                    });
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

            removeUserFromBuffer(buffer, nick) {
                buffer.removeUser(nick);
            },

            getBuffersWithUser(networkid, nick) {
                let network = this.getNetwork(networkid);
                if (!network) {
                    return [];
                }

                let normalisedNick = nick.toLowerCase();
                let buffers = [];
                network.buffers.forEach((buffer) => {
                    let bufferNameLower = buffer.name.toLowerCase();
                    if (buffer.users[normalisedNick] || normalisedNick === bufferNameLower) {
                        buffers.push(buffer);
                    } else if (nick === network.nick && buffer.isQuery()) {
                        buffers.push(buffer);
                    }
                });

                return buffers;
            },

            changeUserNick(networkid, oldNick, newNick) {
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

                // If the nick has completely changed (ie. not just a case change) then update all
                // associated buffers user lists
                if (normalisedOld !== normalisedNew) {
                    state.$set(network.users, normalisedNew, network.users[normalisedOld]);
                    state.$delete(network.users, normalisedOld);

                    Object.keys(user.buffers).forEach((bufferId) => {
                        let buffer = user.buffers[bufferId].buffer;
                        state.$set(buffer.users, normalisedNew, buffer.users[normalisedOld]);
                        state.$delete(buffer.users, normalisedOld);
                    });
                }

                let buffer = this.getBufferByName(network.id, oldNick);
                if (buffer) {
                    buffer.rename(newNick);
                }
            },

            getStartups() {
                return availableStartups;
            },
        },
    });

    return state;
}

let instance = null;
function singleton() {
    instance = instance || createNewState();
    return instance;
}

singleton.create = function createState() {
    return createNewState();
};

singleton.recreate = function recreateState() {
    if (instance) {
        instance.resetState();
        instance.$destroy();
        // eslint-disable-next-line
        instance._watchers.splice(0, instance._watchers.length);
    }

    instance = createNewState();
    return instance;
};

export default singleton;
