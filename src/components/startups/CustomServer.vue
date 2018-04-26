<template>
    <div class="kiwi-customserver" v-bind:class="[is_connecting ? 'kiwi-customserver--connecting' : '']">
        <h2 v-if="!is_connecting" v-html="title"></h2>
        <h2 v-else>{{$t('connecting')}} <a @click="infoClick" class="u-link"><i class="fa fa-info-circle" aria-hidden="true"></i></a></h2>

        <transition name="connectingloader">
        <form v-if="!is_connecting" v-on:submit.prevent="startUp" class="u-form kiwi-customserver-form">
            <div class="kiwi-customserver-error" v-if="network && network.state_error">We couldn't connect to the server :( <span>{{readableStateError(network.state_error)}}</span></div>

            <template v-if="server_type === 'default'">
                <input-text :label="$t('server')" v-model="server">
                    <span class="fa-stack fa-lg kiwi-customserver-tls" :class="[tls ? 'kiwi-customserver-tls--enabled' : '']" @click="tls=!tls">
                        <i class="fa fa-lock fa-stack-1x kiwi-customserver-tls-lock"></i>
                        <i v-if="!tls" class="fa fa-times fa-stack-1x kiwi-customserver-tls-minus"></i>
                    </span>
                </input-text>

                <input-text :label="$t('nick')" v-model="nick" class="kiwi-customserver-nick" />

                <label class="kiwi-customserver-have-password">
                    <input type="checkbox" v-model="show_password_box" /> <span> {{$t('password_have')}} </span>
                </label>
                <input-text v-focus v-if="show_password_box" :label="$t('password')" v-model="password" type="password" />

                <input-text :label="$t('channel')" v-model="channel" />
            </template>

            <template v-if="server_type === 'default_simple'">
                <input-text :label="$t('nick')" v-model="nick" class="kiwi-customserver-nick" />

                <label class="kiwi-customserver-have-password">
                    <input type="checkbox" v-model="show_password_box" /> <span> {{$t('password_have')}} </span>
                </label>
                <input-text v-focus v-if="show_password_box" :label="$t('password')" v-model="password" type="password" />

                <input-text :label="$t('channel')" v-model="channel" class="kiwi-customserver-channel" />
            </template>

            <template v-if="server_type === 'znc'">
                <input-text :label="$t('server')" v-model="server">
                    <span class="fa-stack fa-lg kiwi-customserver-tls" :class="[tls ? 'kiwi-customserver-tls--enabled' : '']" @click="tls=!tls">
                        <i class="fa fa-lock fa-stack-1x kiwi-customserver-tls-lock"></i>
                        <i v-if="!tls" class="fa fa-times fa-stack-1x kiwi-customserver-tls-minus"></i>
                    </span>
                </input-text>

                <input-text :label="$t('username')" v-model="nick" class="kiwi-customserver-nick" />

                <input-text v-if="znc_network_support" :label="$t('network')" v-model="znc_network" />
                <input-text :label="$t('password')" v-model="password" type="password" />
            </template>

            <button type="submit" class="u-button u-button-primary u-submit">{{buttonText}}</button>

            <div v-if="show_type_switcher" class="kiwi-customserver-server-types">
                <a @click="server_type = 'default'" class="u-link">{{$t('network')}}</a>
                <a @click="server_type = 'znc'" class="u-link">{{$t('znc')}}</a>
            </div>
        </form>

        <div v-else class="kiwi-customserver-loader">
            <i class="fa fa-spin fa-spinner" aria-hidden="true"></i>
        </div>
        </transition>
    </div>
</template>

<script>

import _ from 'lodash';
import state from '@/libs/state';
import * as Misc from '@/helpers/Misc';

export default {
    data: function data() {
        return {
            title: 'Where are you connecting today?',
            buttonText: '',
            server_type: 'default',
            server: '',
            tls: false,
            nick: '',
            password: '',
            encoding: 'utf8',
            channel: '',
            znc_network: '',
            znc_network_support: true,
            direct: false,
            direct_path: '',
            show_type_switcher: true,
            show_password_box: false,
            is_connecting: false,
            network: null,
        };
    },
    methods: {
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        startUp: function startUp() {
            let net;

            if (!this.nick) {
                this.$el.querySelector('.kiwi-customserver-nick input').focus();
                return;
            }

            let nick = this.nick;

            if (this.server_type === 'znc') {
                // Older ZNC versions only support user:pass while newer supports user/network:pass
                let password = nick;
                if (this.znc_network) {
                    password += '/' + this.znc_network;
                }
                password += ':' + this.password;

                net = state.addNetwork('ZNC', nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: password,
                });
            } else {
                net = state.addNetwork('Network', nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: this.password,
                    direct: this.direct,
                    path: this.direct_path,
                    encoding: this.encoding,
                });
            }

            if (net) {
                let hasSetActiveBuffer = false;

                let bufferObjs = Misc.extractBuffers(this.channel);
                bufferObjs.forEach((bufferObj, idx) => {
                    let buffer = state.addBuffer(net.id, bufferObj.name);
                    buffer.enabled = true;

                    if (bufferObj.key) {
                        buffer.key = bufferObj.key;
                    }

                    if (idx === 0) {
                        state.setActiveBuffer(net.id, buffer.name);
                        hasSetActiveBuffer = true;
                    }
                });

                if (!hasSetActiveBuffer) {
                    state.setActiveBuffer(net.id, net.serverBuffer().name);
                }

                this.is_connecting = true;
                this.network = net;
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
        processNickRandomNumber: function processNickRandomNumber(nick) {
            // Replace ? with a random number
            let tmp = (nick || '').replace(/\?/g, () => Math.floor(Math.random() * 100).toString());
            return _.trim(tmp);
        },
        infoClick: function infoClick() {
            if (this.network) {
                let net = this.network;
                state.setActiveBuffer(net.id, net.serverBuffer().name);
            }
            this.$emit('start');
        },
        applyDefaults: function applyDefaults() {
            this.server = state.settings.startupOptions.server;
            this.tls = state.settings.startupOptions.tls;
            this.nick = this.processNickRandomNumber(state.settings.startupOptions.nick);
            this.channel = state.settings.startupOptions.channel;
            this.direct = state.settings.startupOptions.direct;
            this.direct_path = state.settings.startupOptions.direct_path;
            this.encoding = state.settings.startupOptions.encoding;

            // Only include the port in the server box if it's not the default
            if (state.settings.startupOptions.port.toString() !== '6667') {
                this.server += ':' + state.settings.startupOptions.port.toString();
            }

            this.title = 'Where are you connecting today?';
        },
    },
    created: async function created() {
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

            let connections = Misc.parseIrcUri(fragment);

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
                this.nick = this.processNickRandomNumber(con.nick);
                this.channel = con.channels.join(',');
                this.direct = con.direct;
                this.encoding = con.encoding;

                if (con.params.type === 'znc') {
                    // Older ZNC versions only support user:pass while newer supports
                    // user/network:pass. Setting the network to _ denotes that we are
                    // connecting to an older ZNC without network support.
                    if (con.params.network === '_') {
                        this.znc_network_support = false;
                    } else {
                        this.znc_network = con.params.network || '';
                    }
                    this.server_type = 'znc';
                    this.title = 'Enter your password to connect to ZNC';
                } else {
                    this.title = 'Enter a nickname to join';
                }
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
                        buffer.enabled = true;
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

        if (state.settings.startupOptions.greetingText) {
            this.title = state.settings.startupOptions.greetingText;
        }
        if (state.settings.startupOptions.buttonText) {
            this.buttonText = state.settings.startupOptions.buttonText;
        } else {
            this.buttonText = this.$t('connect');
        }

        if (saveThisSessionsState) {
            state.persistence.watchStateForChanges();
        }
    },
};
</script>

<style>

.kiwi-customserver {
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    text-align: center;
    padding-top: 1em;
}

.kiwi-customserver-start {
    font-size: 1.1em;
    cursor: pointer;
}

.kiwi-customserver-form {
    max-width: 300px;
    margin: 0 auto;
    max-height: 500px;
    overflow: hidden;
}

.kiwi-customserver .input-text,
.kiwi-customserver .kiwi-customserver-have-password input {
    margin-bottom: 1.5em;
}

.kiwi-customserver-have-password input:checked {
    margin-bottom: 0;
}

.kiwi-customserver-tls {
    cursor: pointer;
    top: 6px;
    color: #bfbfbf;
}

.kiwi-customserver-tls--enabled {
    color: green;
}

.kiwi-customserver-tls-lock {
    font-size: 1.2em;
}

.kiwi-customserver-tls-minus {
    color: red;
    font-size: 0.7em;
    top: 3px;
}

.kiwi-customserver-loader {
    margin-top: 1em;
    font-size: 2em;
}

.kiwi-customserver-channel {
    margin-top: 1em;
}

.kiwi-customserver-server-types {
    font-size: 0.9em;
    text-align: center;
}

.kiwi-customserver-server-types a {
    margin: 0 1em;
}

.kiwi-customserver h2 {
    margin-bottom: 1.5em;
}

.kiwi-customserver h2 i {
    font-size: 0.8em;
    margin-left: 1em;
}

.kiwi-customserver--connecting h2 {
    transition: margin-top 0.7s;
    margin-top: 100px;
}

.kiwi-customserver-error {
    text-align: center;
    margin: 1em 0;
    padding: 0.3em;
}

.kiwi-customserver-error span {
    display: block;
    font-style: italic;
}

.connectingloader-enter-active,
.connectingloader-leave-active {
    transition: max-height 0.5s;
}

.connectingloader-enter,
.connectingloader-leave-to {
    max-height: 0;
}

</style>
