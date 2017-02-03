<template>
    <div class="kiwi-welcome">
        <h2>Where are you connecting today?</h2>
        <form v-on:submit.prevent="startUp" class="u-form kiwi-welcome-form">
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
        </form>

        <div v-if="show_type_switcher" class="kiwi-welcome-server-types">
            <a @click="server_type = 'default'" class="u-link">Network</a>
            <a @click="server_type = 'znc'" class="u-link">ZNC</a>
        </div>
    </div>
</template>

<script>

import * as Storage from 'src/libs/storage/Local';
import state from 'src/libs/state';
import StatePersistence from 'src/libs/StatePersistence';
import logger from 'src/libs/Logger';

export default {
    data: function data() {
        return {
            server_type: 'default',
            server: '',
            tls: false,
            nick: '',
            password: '',
            channel: '',
            znc_network: '',
            show_type_switcher: true,
            show_password_box: false,
        };
    },
    methods: {
        startUp: function startUp() {
            let net;

            if (this.server_type === 'znc') {
                net = state.addNetwork('ZNC', this.nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: this.nick + '/' + this.znc_network + ':' + this.password,
                });
            } else {
                net = state.addNetwork('Network', this.nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: this.password,
                });
            }

            if (net) {
                let hasSetActiveBuffer = false;

                this.channel.split(',').forEach((channelName, idx) => {
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

                net.ircClient.connect();
                this.$emit('start');
            }
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
                channels = channels.split(',').map(_channelName => {
                    let hasPrefix = _channelName[0] === '#' ||
                        _channelName[0] === '&';

                    let channelName = hasPrefix ?
                        _channelName :
                        '#' + _channelName;

                    return channelName;
                });

                // Replace ? with a random number
                let randomNickReplacement = Math.floor(Math.random() * 100).toString();
                let nick = (params.nick || '').replace(/\?/g, randomNickReplacement);

                connections.push({
                    tls: tls,
                    server: m[2],
                    port: parseInt(m[4] || (tls ? 6697 : 6667), 10),
                    channels: channels,
                    nick: nick,
                });
            });

            return connections;
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
            } else if (connections.length === 1) {
                saveThisSessionsState = false;
                this.server_type = 'default_simple';
                this.show_type_switcher = false;

                let con = connections[0];
                this.server = con.server + ':' + con.port;
                this.tls = con.tls;
                this.nick = con.nick;
                this.channel = con.channels.join(',');
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
}
.kiwi-welcome-channel {
    margin-top: 1em;
}
.kiwi-welcome-server-types {
    font-size: 0.9em;
}
.kiwi-welcome-server-types a {
    margin: 0 1em;
}
</style>
