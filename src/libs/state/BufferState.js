/** @module */

import Vue from 'vue';
import _ from 'lodash';
import { def } from './common';
import batchedAdd from '../batchedAdd';
import * as bufferTools from '../bufferTools';

let nextBufferId = 0;

/** The IRC buffer instance */
export default class BufferState {
    constructor(name, networkid, state, messageDict) {
        // Enumerable properties that become reactive under Vue
        this.id = nextBufferId++;
        this.networkid = networkid;
        this.name = name;
        this.topics = [];
        this.key = '';
        this.joined = false;
        this.enabled = true;
        this.created_at = null;
        this.users = Object.create(null);
        this.modes = Object.create(null);
        this.flags = {
            unread: 0,
            alert_on: 'default',
            has_opened: false,
            channel_badkey: false,
            chathistory_available: true,
            requested_modes: false,
            requested_banlist: false,
            is_requesting_chathistory: false,
        };
        this.settings = { };
        this.last_read = 0;
        this.active_timeout = null;
        this.message_count = 0;
        this.current_input = '';
        this.input_history = [];
        this.input_history_pos = 0;
        this.show_input = true;

        // Counter for chathistory requests. While this value is 0, it means that this buffer is
        // still loading messages
        this.chathistory_request_count = 0;

        Vue.observable(this);

        // Some non-enumerable properties (vues $watch won't cover these properties)
        def(this, 'state', state, false);
        def(this, 'messageDict', messageDict, false);

        let messagesObj = {
            networkid: this.networkid,
            buffer: this.name,
            messages: [],
            messageIds: Object.create(null),
        };
        this.messageDict.push(messagesObj);
        def(this, 'messagesObj', messagesObj, false);

        def(this, 'isMessageTrimming', true, true);
        def(this, 'addMessageBatch', createMessageBatch(this), false);
        def(this, 'addUserBatch', createUserBatch(this), false);

        // poll who to update away status if away-notify is not enabled
        if (this.isChannel()) {
            maybeStartWhoLoop(this);
        }

        // When the network re-connects, we reset the chathistory request counter.
        // This will make the `getLoadingState()` stay as 'loading' while the chathistory reloads.
        function onNetworkConnecting(event) {
            if (event.network === this.getNetwork()) {
                this.chathistory_request_count = 0;
            }
        }

        function onNetworkMotd(event, network) {
            if (network === this.getNetwork() && this.isQuery()) {
                this.requestLatestScrollback();
            }
        }

        // Clean up the previous event and itself when the buffer is closed.
        function onBufferClose(event) {
            if (event.buffer === this) {
                this.state.$off('network.connecting', onNetworkConnectingBound);
                this.state.$off('buffer.close', onBufferCloseBound);
                this.state.$off('irc.motd', onNetworkMotdBound);
            }
        }

        const onNetworkConnectingBound = onNetworkConnecting.bind(this);
        const onBufferCloseBound = onBufferClose.bind(this);
        const onNetworkMotdBound = onNetworkMotd.bind(this);

        state.$on('network.connecting', onNetworkConnectingBound);
        state.$on('buffer.close', onBufferCloseBound);
        state.$on('irc.motd', onNetworkMotdBound);

        if (this.isQuery() && this.getNetwork().ircClient.chathistory.isSupported()) {
            // Get PM message histories, while channel buffers request it after their nicklist
            // has been received
            this.requestLatestScrollback();
        }
    }

    get topic() {
        return this.topics.length === 0 ?
            '' :
            this.topics[this.topics.length - 1];
    }

    set topic(newVal) {
        this.topics.push(newVal);
    }

    getNetwork() {
        return this.state.getNetwork(this.networkid);
    }

    getMessages() {
        let bufMessages = _.find(this.messageDict, {
            networkid: this.networkid,
            buffer: this.name,
        });

        return bufMessages ?
            bufMessages.messages :
            [];
    }

    clearMessages() {
        this.messagesObj.messages.splice(0, this.messagesObj.messages.length);
        this.messagesObj.messageIds = Object.create(null);
    }

    // Remove a block of messages between a time (server-time) range. Inclusive.
    clearMessageRange(startTime, endTime) {
        this.messagesObj.messages = this.messagesObj.messages.filter((message) => {
            if (message.server_time < startTime || message.server_time > endTime) {
                return true;
            }

            // This message will be removed
            delete this.messagesObj.messageIds[message.id];
            return false;
        });

        // Mark that something changed
        this.message_count++;
    }

    isServer() {
        return this.name === '*';
    }

    isChannel() {
        let chanPrefixes = ['#', '&'];
        let ircNetwork = this.getNetwork().ircClient.network;
        if (ircNetwork && ircNetwork.options.CHANTYPES) {
            chanPrefixes = ircNetwork.options.CHANTYPES;
        }

        return chanPrefixes.indexOf(this.name[0]) > -1;
    }

    isQuery() {
        let chanPrefixes = ['#', '&'];
        let ircNetwork = this.getNetwork().ircClient.network;
        if (ircNetwork && ircNetwork.options.CHANTYPES) {
            chanPrefixes = ircNetwork.options.CHANTYPES;
        }

        return chanPrefixes.indexOf(this.name[0]) === -1 &&
            !this.isSpecial() &&
            !this.isServer();
    }

    isSpecial() {
        // Special buffer names (Usually controller queries, like *status or *raw).
        // Server buffer '*' is not included in this classification.
        let name = this.name;
        return name[0] === '*' && name.length > 1;
    }

    isUserAnOp(nick) {
        let user = this.state.getUser(this.networkid, nick);
        if (!user) {
            return false;
        }

        let userBufferInfo = user.buffers[this.id];
        if (!userBufferInfo) {
            return false;
        }

        let modes = userBufferInfo.modes;
        let opModes = ['Y', 'y', 'q', 'a', 'o', 'h'];
        let hasOp = _.find(modes, (mode) => opModes.indexOf(mode.toLowerCase()) > -1);

        return !!hasOp;
    }

    /**
     * Get a users prefix symbol on a buffer from its modes
     * @param {Object} user The user object
     */
    userModePrefix(user) {
        // The user may not be on the buffer
        if (!user.buffers[this.id]) {
            return '';
        }

        let modes = user.buffers[this.id].modes;
        if (modes.length === 0) {
            return '';
        }

        let network = this.getNetwork();
        let netPrefixes = network.ircClient.network.options.PREFIX;
        // Find the first (highest) netPrefix in the users buffer modes
        let prefix = _.find(netPrefixes, (p) => modes.indexOf(p.mode) > -1);

        return prefix ?
            prefix.symbol :
            '';
    }

    /**
     * Get a users mode on a buffer
     * @param user {Object} The user object
     */
    userMode(user) {
        // The user may not be on the buffer
        if (!user.buffers[this.id]) {
            return '';
        }

        let modes = user.buffers[this.id].modes;
        if (modes.length === 0) {
            return '';
        }

        // if there is only one mode just return it
        if (modes.length === 1) {
            return modes[0];
        }

        let network = this.getNetwork();
        let netPrefixes = network.ircClient.network.options.PREFIX;
        // Find the first (highest) netPrefix in the users buffer modes
        let prefix = _.find(netPrefixes, (p) => modes.indexOf(p.mode) > -1);

        return prefix ?
            prefix.mode :
            '';
    }

    setting(name, val) {
        if (typeof val !== 'undefined') {
            this.state.$set(this.settings, name, val);
            return val;
        }

        // Check the buffer specific settings before reverting to global settings
        let result = typeof this.settings[name] !== 'undefined' ?
            this.settings[name] :
            this.state.setting('buffers.' + name);

        return result;
    }

    rename(newName) {
        let network = this.getNetwork();
        let oldName = this.name;
        let setActive = this.state.getActiveBuffer() === this;

        this.name = newName;
        if (setActive) {
            this.state.setActiveBuffer(network.id, newName);
        }

        // update the buffer name on our messages
        let bufferMessages = _.find(this.messageDict, { networkid: network.id, buffer: oldName });
        bufferMessages.buffer = newName;
    }

    flag(name, val) {
        if (typeof val !== 'undefined') {
            this.state.$set(this.flags, name, val);
            return val;
        }

        return this.flags[name];
    }

    requestScrollback(_direction) {
        let direction = _direction || 'backward';
        let time = '';
        let chathistoryFuncName = 'before';

        // Going backwards takes the earliest message we already have and requests messages
        // before it. Going forward takes the last message we have and requests messages after
        // it.

        if (direction === 'backward') {
            let lastMessage = this.getMessages().reduce((earliest, current) => {
                let ignoreTypes = ['traffic', 'topic', 'connection', 'presence'];
                let validType = ignoreTypes.indexOf(earliest.type) === -1;
                if (validType && earliest.time && earliest.time < current.time) {
                    return earliest;
                }
                return current;
            }, this.getMessages()[0]);

            chathistoryFuncName = 'before';
            time = lastMessage ?
                new Date(lastMessage.server_time) :
                new Date();
        } else if (direction === 'forward') {
            let firstMessage = this.getMessages().reduce((latest, current) => {
                let ignoreTypes = ['traffic', 'topic', 'connection', 'presence'];
                let validType = ignoreTypes.indexOf(latest.type) === -1;
                if (validType && latest.time && latest.time > current.time) {
                    return latest;
                }
                return current;
            }, this.getMessages()[0]);

            chathistoryFuncName = 'after';
            time = firstMessage ?
                new Date(firstMessage.server_time) :
                new Date();
        } else {
            throw new Error('Invalid direction for requestScrollback(): ' + _direction);
        }

        let ircClient = this.getNetwork().ircClient;
        this.flag('is_requesting_chathistory', true);
        this.chathistory_request_count += 1;
        ircClient.chathistory[chathistoryFuncName](this.name, time)
            .then((event) => {
                if (!event) {
                    this.flag('chathistory_available', false);
                    return;
                }

                // If we have messages in this response, assume there will be more. When we get 0
                // messages in response, that's how we know we are at the end
                let hasNewMessages = event.commands.length > 0;

                // If there are new messages, then there could be more in the backlog.
                // If there are no new messages, then the chat history is empty.
                this.flag('chathistory_available', hasNewMessages);
            })
            .finally(() => {
                this.flag('is_requesting_chathistory', false);
            });
    }

    requestLatestScrollback() {
        let ircClient = this.getNetwork().ircClient;
        this.flag('is_requesting_chathistory', true);
        this.chathistory_request_count += 1;
        ircClient.chathistory.before(this.name, '*').finally(() => {
            this.flag('is_requesting_chathistory', false);
        });
    }

    markAsRead(delayed) {
        if (this.active_timeout) {
            clearTimeout(this.active_timeout);
            this.active_timeout = null;
        }
        if (delayed) {
            this.active_timeout = setTimeout(
                this.markAsRead.bind(this),
                10000,
                false
            );
        } else {
            this.last_read = Date.now();
            this.flag('highlight', false);

            // If running under a bouncer, set it on the server-side too
            let network = this.getNetwork();
            let allowedUpdate = !network ? false : this.isChannel() || this.isQuery();
            if (allowedUpdate && network.connection.bncnetid) {
                network.ircClient.bnc.bufferSeen(
                    network.connection.bncnetid,
                    this.name,
                    new Date(),
                );
            }
        }
    }

    incrementFlag(flagName) {
        this.flags[flagName] = (this.flags[flagName] || 0) + 1;
    }

    addUser(user) {
        this.addUserBatch(user);
    }

    hasNick(nick) {
        let nickLower = nick.toLowerCase();
        return (
            nickLower in this.users ||
            (this.isQuery() && this.name.toLowerCase() === nickLower)
        );
    }

    removeUser(nick) {
        let userObj = this.state.getUser(this.networkid, nick);

        // A user could be queued to be added, so make sure it's not there as it
        // would just be added again. Eg. user joins/parts during a flood
        _.pull(this.addUserBatch.queue(), userObj);

        this.state.$delete(this.users, nick.toLowerCase());

        if (userObj) {
            delete userObj.buffers[this.id];
        }
    }

    clearUsers() {
        // Users could be queued to be added, so make sure to clear them as they
        // would just be added again. Eg. user joins/parts during a flood
        this.addUserBatch && this.addUserBatch.queue().splice(0);

        _.each(this.users, (userObj, nick) => {
            delete userObj.buffers[this.id];
        });

        this.state.$set(this, 'users', {});
    }

    addMessage(message) {
        this.addMessageBatch(message);
    }

    say(message, opts = {}) {
        let network = this.getNetwork();
        let newMessage = {
            time: Date.now(),
            nick: network.nick,
            message: message,
            type: opts.type || 'privmsg',
        };

        this.state.addMessage(this, newMessage);

        let fnNames = {
            privmsg: 'say',
            action: 'action',
            notice: 'notice',
        };
        let fnName = fnNames[opts.type] || 'say';
        network.ircClient[fnName](this.name, message);
    }

    join() {
        if (!this.isChannel()) {
            return;
        }

        let network = this.getNetwork();
        network.ircClient.join(this.name, this.key || '');
    }

    part(reason) {
        if (!this.isChannel()) {
            return;
        }

        let network = this.getNetwork();
        network.ircClient.part(this.name, reason || '');
    }

    scrollToMessage(id) {
        this.state.$emit('messagelist.scrollto', { id: id });
    }

    getLoadingState() {
        const networkState = this.getNetwork().state;
        const historySupport = !!this.getNetwork().ircClient.chathistory.isSupported();
        const messagesInBatchQueue = this.addMessageBatch.queue().length;
        // Hack; We need to make vue aware that we depend on message_count in order to
        // update the loading state.
        // eslint-disable-next-line no-unused-vars
        const messageCount = this.message_count;

        if (networkState === 'disconnected') {
            return 'disconnected';
        } else if (networkState === 'connecting') {
            return 'connecting';
        } else if (
            networkState === 'connected' &&
            this.joined &&
            this.enabled &&
            (
                historySupport &&
                (this.flags.is_requesting_chathistory ||
                    // If chathistory is supported then a request will always be made when first
                    // joining a channel. If request_count===0 then we're still waiting for it
                    // to happen.
                    this.chathistory_request_count === 0 ||
                    // keep in loading state while the batch is being processed
                    messagesInBatchQueue > 0
                )
            )
        ) {
            return 'loading';
        }
        return 'done';
    }

    isReady() {
        return this.getLoadingState() === 'done';
    }
}

/**
 * Batch up floods of addUsers for a huge performance gain.
 * Generally happens when reconnecting to a BNC
 */
function createUserBatch(bufferState) {
    let addSingleUser = (u) => {
        bufferState.state.$set(bufferState.users, u.nick.toLowerCase(), u);
    };
    let addMultipleUsers = (users) => {
        let o = _.clone(bufferState.users);
        users.forEach((u) => {
            o[u.nick.toLowerCase()] = u;
        });
        bufferState.users = o;
    };

    return batchedAdd(addSingleUser, addMultipleUsers, 2);
}

/**
 * batch up floods of new messages for a huge performance gain
 */
function createMessageBatch(bufferState) {
    let addSingleMessage = (newMessage) => {
        if (bufferState.messagesObj.messageIds[newMessage.id]) {
            return;
        }
        bufferState.messagesObj.messages.push(newMessage);
        bufferState.messagesObj.messageIds[newMessage.id] = newMessage;
        if (bufferState.isMessageTrimming) {
            trimMessages();
        }
        bufferTools.orderedMessages(bufferState, { inPlace: true, noFilter: true });
        bufferState.message_count++;
    };
    let addMultipleMessages = (newMessages) => {
        let toAdd = newMessages.filter((msg) => !bufferState.messagesObj.messageIds[msg.id]);
        if (toAdd.length > 0) {
            bufferState.messagesObj.messages = bufferState.messagesObj.messages.concat(toAdd);
            toAdd.forEach((msg) => {
                bufferState.messagesObj.messageIds[msg.id] = msg;
            });
            if (bufferState.isMessageTrimming) {
                trimMessages();
            }
            bufferTools.orderedMessages(bufferState, { inPlace: true, noFilter: true });
        }
        // Trigger Vue's reactivity on the buffer whether messages were added or not, just in case
        // anything was depending on the batch queue which has now been emptied.
        bufferState.message_count++;
    };
    let trimMessages = () => {
        let scrollbackSize = bufferState.setting('scrollback_size');
        let length = bufferState.messagesObj.messages.length;
        if (bufferState.messagesObj.messages.length > scrollbackSize) {
            let removed = bufferState.messagesObj.messages.splice(0, length - scrollbackSize);
            removed.forEach((msg) => delete bufferState.messagesObj.messageIds[msg.id]);
        }
    };

    return batchedAdd(addSingleMessage, addMultipleMessages, 4);
}

// Update our user list status every 30seconds to get each users current away status
function maybeStartWhoLoop(bufferState) {
    let network = bufferState.state.getNetwork(bufferState.networkid);

    if (network.state === 'connected') {
        // network is connected start the loop if its needed
        nextLoop();
    } else {
        // Network is not coonnected. Wait until it is
        let on001 = (command, event, eventNetwork) => {
            if (eventNetwork === network) {
                bufferState.state.$off('irc.raw.001', on001);
                nextLoop();
            }
        };
        bufferState.state.$on('irc.raw.001', on001);
    }

    function nextLoop() {
        setTimeout(updateWhoStatusLoop, 30000);
    }

    function updateWhoStatusLoop() {
        network = bufferState.state.getNetwork(bufferState.networkid);

        // Make sure the network still exists
        if (!network) {
            return;
        }

        // Make sure the buffer still exists
        if (!network.bufferByName(bufferState.name)) {
            return;
        }

        let whoLoop = bufferState.setting('who_loop');
        let isJoined = bufferState.joined;
        let hasAwayNotify = network.ircClient.network.cap.isEnabled('away-notify');
        let networkConnected = network.state === 'connected';

        if (whoLoop && networkConnected && isJoined && !hasAwayNotify) {
            network.ircClient.who(bufferState.name, () => {
                nextLoop();
            });
        } else {
            nextLoop();
        }
    }
}
