/** @module */

import Vue from 'vue';
import { def } from './common';
import * as IrcClient from '../IrcClient';

/** The IRC network instance */
export default class NetworkState {
    constructor(id, appState, userDict, bufferDict) {
        // Enumerable properties that become reactive under Vue
        this.id = id;
        this.name = '';
        // State of the transport
        this.state = 'disconnected';
        this.state_error = '';
        // Last error from the IRC server. Resets on reconnect
        this.last_error = '';
        this.auto_commands = '';
        this.is_znc = false;
        this.hidden = false;
        this.channel_list = [];
        this.channel_list_state = '';
        // The IRCd type as mentioned in the 002 numeric
        this.ircd = '';
        this.connection = {
            server: '',
            port: 6667,
            tls: false,
            path: '',
            password: '',
            direct: false,
            encoding: 'utf8',
            bncnetid: '',
            nick: '',
        };
        this.settings = {
            show_raw_caps: false,
        };
        this.nick = '';
        this.username = '';
        this.gecos = '';
        this.password = '';
        this.away = '';

        Vue.observable(this);

        // Some non-enumerable properties (vues $watch won't cover these properties)
        def(this, 'appState', appState, false);
        def(this, 'userDict', userDict, false);
        def(this, 'bufferDict', bufferDict, false);
        def(this, 'frameworkClient', null, true);

        def(this, 'users', Object.create(null), (newVal) => {
            appState.$set(userDict.networks, this.id, newVal);
        });

        // Pending prviate messages awaiting whois operator check
        def(this, 'pendingPms', [], false);

        bufferDict.$set(bufferDict.networks, this.id, []);
    }

    get ircClient() {
        if (!this.frameworkClient) {
            this.frameworkClient = IrcClient.create(this.appState, this);
        }

        return this.frameworkClient;
    }

    get buffers() {
        return this.bufferDict.networks[this.id];
    }

    connect(...args) {
        this.ircClient.connect(...args);
    }

    bufferByName(name) {
        return this.appState.getBufferByName(this.id, name);
    }

    serverBuffer() {
        return this.appState.getBufferByName(this.id, '*');
    }

    setting(name, val) {
        if (typeof val !== 'undefined') {
            this.appState.$set(this.settings, name, val);
            return val;
        }

        return this.settings[name];
    }

    isChannelName(input) {
        if (typeof input !== 'string' || !input) {
            return false;
        }

        let chanPrefixes = this.ircClient.network.supports('CHANTYPES') || '#&';
        return chanPrefixes.indexOf(input[0]) > -1;
    }

    showServerBuffer(tabName) {
        this.appState.$emit('active.component', null);
        this.appState.setActiveBuffer(this.id, this.serverBuffer().name);
        // Hacky, but the server buffer component listens for events to switch
        // between tabs
        setImmediate(() => {
            this.appState.$emit('server.tab.show', tabName || 'settings');
        });
    }

    /**
     * Check if a nick is exempt from block PM's
     * @param {String} nick of the user to check
     * @returns {Boolean} If the boolean is null a whois check is required
     */
    isNickExemptFromPmBlocks(nick) {
        // Check if nick is op of shared channel
        let buffers = this.appState.getBuffersWithUser(this.id, nick);
        for (let i = 0; i < buffers.length; i++) {
            let buffer = buffers[i];
            if (buffer.isUserAnOp(nick)) {
                return true;
            }
        }

        let user = this.appState.getUser(this.indexOf, nick);
        if (!user || !user.hasWhois) {
            // if we have not seen or whois the user they might be a network oper
            // so return null then a whois can be performed
            return null;
        }

        if (user.operator) {
            return true;
        }
        return false;
    }

    currentUser() {
        return this.appState.getUser(this.id, this.nick);
    }

    userByName(nick) {
        return this.appState.getUser(this.id, nick);
    }
}
