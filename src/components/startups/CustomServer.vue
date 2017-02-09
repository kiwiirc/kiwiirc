<template>
    <div class="kiwi-welcome" v-bind:class="[is_connecting ? 'kiwi-welcome--connecting' : '']">
        <h2 v-if="!is_connecting">{{title}}</h2>
        <h2 v-else>Connecting... <a @click="infoClick" class="u-link"><i class="fa fa-info-circle" aria-hidden="true"></i></a></h2>

        <transition name="connectingloader">
        <form v-if="!is_connecting" v-on:submit.prevent="startUp" class="u-form kiwi-welcome-form">
            <template v-if="server_type === 'default'">
                <label>
                    <span>Server</span>
                    <input type="text" v-model="server" />
                </label>
                <label>
                    <span>SSL / TLS</span>
                    <input type="checkbox" v-model="tls" />
                </label>
                <label>
                    <span>Nick</span>
                    <input type="text" v-model="nick" />
                </label>
                <label class="kiwi-welcome-have-password">
                    <span></span><input type="checkbox" v-model="show_password_box" /> I have a password
                </label>
                <label v-if="show_password_box">
                    <span>Password</span>
                    <input type="password" v-model="password" />
                </label>
                <label class="kiwi-welcome-channel">
                    <span>Channel</span>
                    <input type="text" v-model="channel" />
                </label>
            </template>

            <template v-if="server_type === 'default_simple'">
                <label>
                    <span>Nick</span>
                    <input type="text" v-model="nick" />
                </label>
                <label class="kiwi-welcome-have-password">
                    <span></span><input type="checkbox" v-model="show_password_box" /> I have a password
                </label>
                <label v-if="show_password_box">
                    <span>Password</span>
                    <input type="password" v-model="password" />
                </label>
                <label class="kiwi-welcome-channel">
                    <span>Channel</span>
                    <input type="text" v-model="channel" />
                </label>
            </template>

            <template v-if="server_type === 'znc'">
                <label>
                    <span>Server</span>
                    <input type="text" v-model="server" />
                </label>
                <label>
                    <span>SSL / TLS</span>
                    <input type="checkbox" v-model="tls" />
                </label>
                <label>
                    <span>Username</span>
                    <input type="text" v-model="nick" />
                </label>
                <label>
                    <span>Network</span>
                    <input type="text" v-model="znc_network" />
                </label>
                <label>
                    <span>Password</span>
                    <input type="password" v-model="password" />
                </label>
            </template>

            <button type="submit" class="u-button u-button-primary u-submit">Connect</button>

            <div v-if="show_type_switcher" class="kiwi-welcome-server-types">
                <a @click="server_type = 'default'" class="u-link">Network</a>
                <a @click="server_type = 'znc'" class="u-link">ZNC</a>
            </div>
        </form>

        <div v-else class="kiwi-welcome-loader">
            <i class="fa fa-spin fa-spinner" aria-hidden="true"></i>
        </div>
        </transition>

        <div style="position:fixed;bottom:20px;left:0;right:0;text-align:center;">
            <i><b>This is a test server. All connections will appear from a single temporary IP address!</b></i>
            <div><a href="/?config=websockettest">Try out the direct websocket test. This will connect your browser directly to the IRC network without a kiwiirc.com proxy</a></div>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import * as Storage from 'src/libs/storage/Local';
import state from 'src/libs/state';
import StatePersistence from 'src/libs/StatePersistence';
import logger from 'src/libs/Logger';

export default {
    data: function data() {
        return {
            title: 'Where are you connecting today?',
            server_type: 'default',
            server: '',
            tls: false,
            nick: '',
            password: '',
            channel: '',
            znc_network: '',
            direct: false,
            show_type_switcher: true,
            show_password_box: false,
            is_connecting: false,
            connecting_net: null,
        };
    },
    methods: {
        startUp: function startUp() {
            let net;

            if (!this.nick) {
                return;
            }

            // Replace ? with a random number
            let randomNickReplacement = Math.floor(Math.random() * 100).toString();
            let nick = (this.nick || '').replace(/\?/g, randomNickReplacement);

            if (this.server_type === 'znc') {
                net = state.addNetwork('ZNC', nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: nick + '/' + this.znc_network + ':' + this.password,
                });
            } else {
                net = state.addNetwork('Network', nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: this.password,
                    direct: this.direct,
                });
            }

            if (net) {
                let hasSetActiveBuffer = false;

                this.channel.split(',').forEach((channelName, idx) => {
                    if (!channelName) {
                        return;
                    }

                    let buffer = state.addBuffer(net.id, channelName);
                    buffer.joined = true;

                    if (idx === 0) {
                        state.setActiveBuffer(net.id, buffer.name);
                        hasSetActiveBuffer = true;
                    }
                });

                if (!hasSetActiveBuffer) {
                    state.setActiveBuffer(net.id, net.serverBuffer().name);
                }

                this.is_connecting = true;
                this.connecting_net = net;
                net.ircClient.connect();

                let onRegistered = () => {
                    setTimeout(() => { this.is_connecting = false; }, 1000);
                    this.$emit('start');
                    net.ircClient.off('registered', onRegistered);
                    net.ircClient.off('close', onClosed);
                };
                let onClosed = () => {
                    setTimeout(() => { this.is_connecting = false; }, 1000);
                    net.ircClient.off('registered', onRegistered);
                    net.ircClient.off('close', onClosed);
                };
                net.ircClient.once('registered', onRegistered);
                net.ircClient.once('close', onClosed);
            }
        },
        infoClick: function infoClick() {
            if (this.connecting_net) {
                let net = this.connecting_net;
                state.setActiveBuffer(net.id, net.serverBuffer().name);
            }
            this.$emit('start');
        },
        parseConnectionString: function parseConnectionString(str) {
            // [ircs?://]irc.network.net:[+]6667/channel?nick=mynick;
            // Parse connection string such as this ^ into an object. Multiple connections
            // may be given, separated by ;
            let reg = /(?:(ircs?):\/\/)?([a-z.]+)(?::(?:(\+)?([0-9]+)))?(?:\/([^?]*))?(?:\?(.*))?/;
            let connections = [];
            str.split(';').forEach(connectionString => {
                if (!connectionString) {
                    return;
                }

                let m = connectionString.match(reg);

                if (!m) {
                    return;
                }

                let tls = m[1] === 'ircs' || !!m[3];
                let params = Object.create(null);
                (m[6] || '').split('&').forEach(p => {
                    let parts = p.split('=');
                    if (parts.length === 2) {
                        params[parts[0].toLowerCase()] = parts[1];
                    }
                });

                let channels = (m[5] || params.channel || '');
                channels = _(channels.split(','))
                    .compact()
                    .map(_channelName => {
                        let hasPrefix = _channelName[0] === '#' ||
                            _channelName[0] === '&';

                        let channelName = hasPrefix ?
                            _channelName :
                            '#' + _channelName;

                        return channelName;
                    });

                connections.push({
                    tls: tls,
                    server: m[2],
                    port: parseInt(m[4] || (tls ? 6697 : 6667), 10),
                    channels: channels,
                    nick: (params.nick || 'kiwi_?'),
                });
            });

            return connections;
        },
        applyDefaults: function applyDefaults() {
            this.server = state.settings.startupOptions.server;
            this.tls = state.settings.startupOptions.tls;
            this.nick = state.settings.startupOptions.nick;
            this.channel = state.settings.startupOptions.channel;
            this.direct = state.settings.startupOptions.direct;

            this.title = 'Where are you connecting today?';
        },
    },
    created: async function created() {
        let persist = new StatePersistence('kiwi-state', state, Storage, logger);
        await persist.loadStateIfExists();

        let saveThisSessionsState = false;

        // If we have networks from a previous state, launch directly into it
        if (state.networks.length > 0) {
            let network = state.networks[0];
            state.setActiveBuffer(network.id, network.serverBuffer().name);
            saveThisSessionsState = true;
            this.$emit('start');
        } else if (window.location.hash.substr(1)) {
            let fragment = window.location.hash.substr(1);

            // Check to see if we're dealing with an encoded irc: uri (browsers do this
            // when clicking an IRC link)
            let uriCheck = fragment.substr(0, 7).toLowerCase();
            if (uriCheck === 'ircs%3a' || uriCheck.substr(0, 6) === 'irc%3a') {
                fragment = decodeURIComponent(fragment);
            }

            let connections = this.parseConnectionString(fragment);

            // If more than 1 connection string is given, skip the connection screen
            // and add them all right away.
            if (connections.length === 0) {
                saveThisSessionsState = true;
                this.applyDefaults();
            } else if (connections.length === 1) {
                saveThisSessionsState = false;
                this.server_type = 'default_simple';
                this.show_type_switcher = false;

                let con = connections[0];
                this.server = con.server + ':' + con.port;
                this.tls = con.tls;
                this.nick = con.nick;
                this.channel = con.channels.join(',');

                this.title = 'Enter a nickname to join';
            } else if (connections.length > 1) {
                saveThisSessionsState = false;

                connections.forEach((con, idx) => {
                    let net = state.addNetwork(con.server, con.nick, {
                        server: con.server,
                        port: con.port,
                        tls: con.tls,
                        password: con.password || '',
                    });

                    con.channels.forEach(channelName => {
                        let buffer = state.addBuffer(net.id, channelName);
                        buffer.joined = true;
                    });

                    // Set the first server buffer active
                    if (idx === 0) {
                        state.setActiveBuffer(net.id, net.serverBuffer().name);
                    }
                });

                this.$emit('start');
            }
        } else {
            saveThisSessionsState = true;
            this.applyDefaults();
        }

        if (saveThisSessionsState) {
            persist.watchStateForChanges();
        }
    },
};
</script>

<style>

.kiwi-welcome {
    text-align: center;
    margin-top: 1em;
}
.kiwi-welcome-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-form {
    width: 300px;
    margin: 0 auto;
    max-height: 500px;
    overflow: hidden;
}
.kiwi-welcome-channel {
    margin-top: 1em;
}
.kiwi-welcome-server-types {
    font-size: 0.9em;
    text-align: center;
}
.kiwi-welcome-server-types a {
    margin: 0 1em;
}

.kiwi-welcome-loader {
    margin-top: 1em;
    font-size: 2em;
}

.kiwi-welcome h2 {
    margin-bottom: 1em;
}
.kiwi-welcome h2 i {
    font-size: 0.8em;
    margin-left: 1em;
}
.kiwi-welcome--connecting h2 {
    transition: margin-top .7s;
    margin-top: 100px;
}

.connectingloader-enter-active, .connectingloader-leave-active {
  transition: max-height .5s
}
.connectingloader-enter, .connectingloader-leave-to {
  max-height: 0
}
</style>
