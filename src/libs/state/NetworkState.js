/** @module */

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
        this.channel_list = [];
        this.channel_list_state = '';
        this.connection = {
            server: '',
            port: 6667,
            tls: false,
            path: '',
            password: '',
            direct: false,
            encoding: 'utf8',
            bncname: '',
        };
        this.settings = {};
        this.nick = '';
        this.username = '';
        this.gecos = '';
        this.password = '';

        // Some non-enumerable properties (vues $watch won't cover these properties)
        def(this, 'appState', appState, false);
        def(this, 'userDict', userDict, false);
        def(this, 'bufferDict', bufferDict, false);
        def(this, 'frameworkClient', null, true);

        def(this, 'users', Object.create(null), (newVal) => {
            appState.$set(userDict.networks, this.id, newVal);
        });

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
}
