<template>
    <startup-layout ref="layout"
                    class="kiwi-welcome-simple"
    >
        <template v-if="startupOptions.altComponent" v-slot:connection>
            <component :is="startupOptions.altComponent" @close="onAltClose" />
        </template>
        <template v-else v-slot:connection>
            <form class="u-form u-form--big kiwi-welcome-simple-form" @submit.prevent="formSubmit">
                <h2 v-html="greetingText" />
                <div v-if="errorMessage" class="kiwi-welcome-simple-error">{{ errorMessage }}</div>
                <div
                    v-else-if="network && (network.last_error || network.state_error)"
                    class="kiwi-welcome-simple-error"
                >
                    <span v-if="!network.last_error && network.state_error">
                        {{ $t('network_noconnect') }}
                    </span>
                    <span>
                        {{ network.last_error || readableStateError(network.state_error) }}
                    </span>
                </div>

                <input-text
                    v-model="nick"
                    v-focus="!nick || !show_password_box"
                    :label="$t('nick')"
                    type="text"
                />

                <div v-if="showPass && toggablePass" class="kiwi-welcome-simple-input-container">
                    <label
                        class="kiwi-welcome-simple-have-password"
                    >
                        <input v-model="show_password_box" type="checkbox">
                        <span> {{ $t('password_have') }} </span>
                    </label>
                </div>

                <div v-if="showPass && (show_password_box || !toggablePass)"
                     class="kiwi-welcome-simple-input-container"
                >
                    <input-text
                        v-model="password"
                        v-focus="nick || show_password_box"
                        :show-plain-text="true"
                        :label="$t('password')"
                        type="password"
                    />
                </div>

                <div v-if="showChannel" class="kiwi-welcome-simple-input-container">
                    <input-text
                        v-model="channel"
                        :label="$t('channel')"
                    />
                </div>

                <captcha
                    :network="network"
                />

                <button
                    v-if="!network || network.state === 'disconnected'"
                    :disabled="!readyToStart"
                    class="u-button u-button-primary u-submit kiwi-welcome-simple-start"
                    type="submit"
                    v-html="buttonText"
                />
                <button
                    v-else
                    class="u-button u-button-primary u-submit kiwi-welcome-simple-start"
                    disabled
                >
                    <i class="fa fa-spin fa-spinner" aria-hidden="true" />
                </button>

                <div v-html="footerText" />
            </form>
        </template>
    </startup-layout>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import Logger from '@/libs/Logger';
import BouncerProvider from '@/libs/BouncerProvider';
import Captcha from '@/components/Captcha';
import StartupLayout from './CommonLayout';

let log = Logger.namespace('Welcome.vue');

export default {
    components: {
        Captcha,
        StartupLayout,
    },
    data: function data() {
        return {
            errorMessage: '',
            network: null,
            channel: '',
            nick: '',
            password: '',
            showChannel: true,
            showPass: true,
            toggablePass: true,
            showNick: true,
            show_password_box: false,
            connectWithoutChannel: false,
            showPlainText: false,
            captchaReady: false,
        };
    },
    computed: {
        startupOptions() {
            return this.$state.settings.startupOptions;
        },
        greetingText: function greetingText() {
            let greeting = this.$state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_greeting');
        },
        footerText: function footerText() {
            let footer = this.$state.settings.startupOptions.footerText;
            return typeof footer === 'string' ?
                footer :
                '';
        },
        buttonText: function buttonText() {
            let greeting = this.$state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
        readyToStart: function readyToStart() {
            let ready = !!this.nick;

            if (!this.connectWithoutChannel && !this.channel) {
                ready = false;
            }

            // Make sure the channel name starts with a common channel prefix
            if (!this.connectWithoutChannel) {
                let bufferObjs = Misc.extractBuffers(this.channel);
                bufferObjs.forEach((bufferObj) => {
                    if ('#&'.indexOf(bufferObj.name[0]) === -1) {
                        ready = false;
                    }
                });
            }

            // If toggling the password is is disabled, assume it is required
            if (!this.toggablePass && !this.password) {
                ready = false;
            }

            let nickPatternStr = this.$state.setting('startupOptions.nick_format');
            let nickPattern = '';
            if (!nickPatternStr) {
                // Nicks cannot start with [0-9- ]
                // ? is not a valid nick character but we allow it as it gets replaced
                // with a number.
                nickPattern = /^[a-z_\\[\]{}^`|][a-z0-9_\-\\[\]{}^`|]*$/i;
            } else {
                // Support custom pattern matches. Eg. only '@example.com' may be allowed
                // on some IRCDs
                let pattern = '';
                let flags = '';
                if (nickPatternStr[0] === '/') {
                    // Custom regex
                    let pos = nickPatternStr.lastIndexOf('/');
                    pattern = nickPatternStr.substring(1, pos);
                    flags = nickPatternStr.substr(pos + 1);
                } else {
                    // Basic contains rule
                    pattern = _.escapeRegExp(nickPatternStr);
                    flags = 'i';
                }

                try {
                    nickPattern = new RegExp(pattern, flags);
                } catch (error) {
                    log.error('Nick format error: ' + error.message);
                    return false;
                }
            }

            if (!this.nick.match(nickPattern)) {
                ready = false;
            }

            return ready;
        },
    },
    created: function created() {
        let options = this.startupOptions;
        let connectOptions = this.connectOptions();

        // Take some settings from a previous network if available
        let previousNet = null;
        if (connectOptions.hostname.trim()) {
            previousNet = this.$state.getNetworkFromAddress(connectOptions.hostname.trim());
        }

        if (previousNet && previousNet.connection.nick) {
            this.nick = previousNet.connection.nick;
        } else if (Misc.queryStringVal('nick')) {
            this.nick = Misc.queryStringVal('nick');
        } else {
            this.nick = options.nick;
        }
        this.nick = this.processNickRandomNumber(this.nick || '');

        if (options.password) {
            this.password = options.password;
        } else if (previousNet && previousNet.password) {
            this.password = previousNet.password;
            this.show_password_box = true;
        } else {
            this.password = '';
        }

        this.channel = decodeURIComponent(window.location.hash) || options.channel || '';
        this.showChannel = typeof options.showChannel === 'boolean' ?
            options.showChannel :
            true;
        this.showNick = typeof options.showNick === 'boolean' ?
            options.showNick :
            true;
        this.showPass = typeof options.showPassword === 'boolean' ?
            options.showPassword :
            true;
        this.toggablePass = typeof options.toggablePassword === 'boolean' ?
            options.toggablePassword :
            true;

        this.connectWithoutChannel = !!options.allowNoChannel;

        if (options.bouncer) {
            this.toggablePass = false;
            this.showPass = true;
            this.showChannel = false;
            this.connectWithoutChannel = true;

            let bouncer = new BouncerProvider(this.$state);
            bouncer.enable(
                connectOptions.hostname,
                connectOptions.port,
                connectOptions.tls,
                connectOptions.direct,
                connectOptions.direct_path
            );
        }

        if (options.autoConnect && this.nick && (this.channel || this.connectWithoutChannel)) {
            this.startUp();
        }
    },
    methods: {
        onAltClose(event) {
            if (event.channel) {
                this.channel = event.channel;
            }
            if (event.nick) {
                this.nick = event.nick;
            }
            if (event.password) {
                this.password = event.password;
            }
            if (event.error) {
                this.errorMessage = event.error;
            }

            this.$state.settings.startupOptions.altComponent = null;
        },
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        formSubmit: function formSubmit() {
            if (this.readyToStart) {
                this.startUp();
            }
        },
        startUp: function startUp() {
            this.errorMessage = '';

            let options = Object.assign({}, this.$state.settings.startupOptions);
            let connectOptions = this.connectOptions();
            let netAddress = _.trim(connectOptions.hostname);

            // Check if we have this network already
            let net = this.network || this.$state.getNetworkFromAddress(netAddress);

            let password = this.password;

            // If the network doesn't already exist, add a new one
            net = net || this.$state.addNetwork('Network', this.nick, {
                server: netAddress,
                port: connectOptions.port,
                tls: connectOptions.tls,
                password: password,
                encoding: _.trim(options.encoding),
                direct: connectOptions.direct,
                path: connectOptions.direct_path || '',
                gecos: options.gecos,
                username: options.username,
            });

            // Clear the server buffer in case it already existed and contains messages relating to
            // the previous connection, such as errors. They are now redundant since this is a
            // new connection.
            net.serverBuffer().clearMessages();

            // If we retreived an existing network, update the nick+password with what
            // the user has just put in place
            net.connection.nick = this.nick;
            if (options.bouncer) {
                // Bouncer mode uses server PASS
                net.connection.password = `${this.nick}:${password}`;
                net.password = '';
            } else {
                net.connection.password = '';
                net.password = password;
            }

            if (_.trim(options.encoding || '')) {
                net.connection.encoding = _.trim(options.encoding);
            }

            this.network = net;

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            let bufferObjs = Misc.extractBuffers(this.channel);
            bufferObjs.forEach((bufferObj) => {
                let newBuffer = this.$state.addBuffer(net.id, bufferObj.name);
                newBuffer.enabled = true;

                if (newBuffer && !hasSwitchedActiveBuffer) {
                    this.$state.setActiveBuffer(net.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }

                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }
            });

            // switch to server buffer if no channels are joined
            if (!options.bouncer && !hasSwitchedActiveBuffer) {
                this.$state.setActiveBuffer(net.id, net.serverBuffer().name);
            }

            net.ircClient.connect();
            let onRegistered = () => {
                if (this.$refs.layout) {
                    this.$refs.layout.close();
                }
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            let onClosed = () => {
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            net.ircClient.once('registered', onRegistered);
            net.ircClient.once('close', onClosed);
        },
        processNickRandomNumber: function processNickRandomNumber(nick) {
            // Replace ? with a random number
            let tmp = (nick || '').replace(/\?/g, () => Math.floor(Math.random() * 100).toString());
            return _.trim(tmp);
        },
        handleCaptcha(isReady) {
            this.captchaReady = isReady;
        },
        connectOptions() {
            let options = Object.assign({}, this.$state.settings.startupOptions);
            let connectOptions = Misc.connectionInfoFromConfig(options);

            // If a server isn't specified in the config, set some defaults
            // The webircgateway will have a default network set and will connect
            // there instead. This just removes the requirement of specifying the same
            // irc network address in both the server-side and client side configs
            connectOptions.hostname = connectOptions.hostname || 'default';
            if (!connectOptions.port && connectOptions.direct) {
                connectOptions.port = connectOptions.tls ?
                    443 :
                    80;
            } else if (!connectOptions.port && !connectOptions.direct) {
                connectOptions.port = connectOptions.tls ?
                    6697 :
                    6667;
            }

            return connectOptions;
        },
    },
};
</script>

<style>

/* Containers */
form.kiwi-welcome-simple-form {
    width: 70%;
    padding: 20px;
}

@media (max-width: 1025px) {
    form.kiwi-welcome-simple-form {
        width: 100%;
    }
}

@media (max-width: 850px) {
    form.kiwi-welcome-simple-form {
        background: var(--brand-default-bg);
        border-radius: 5px;
        box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.2);
    }
}

@media (max-width: 600px) {
    form.kiwi-welcome-simple-form {
        max-width: 350px;
    }
}

form.kiwi-welcome-simple-form h2 {
    margin: 0 0 40px 0;
    padding: 0;
    cursor: default;
    font-weight: 600;
    font-size: 2.2em;
    text-align: center;
    line-height: 1.2em;
}

.kiwi-welcome-simple-error {
    text-align: center;
    margin: 1em 0;
    padding: 1em;
}

.kiwi-welcome-simple-error span {
    display: block;
    font-style: italic;
}

.kiwi-welcome-simple-input-container {
    width: 100%;
    height: auto;
    position: relative;
    margin: 0 0 20px 0;
}

.kiwi-welcome-simple-input-container:last-of-type {
    margin: 20px 0 40px 0;
}

.kiwi-welcome-simple-form .u-submit {
    width: 100%;
    height: 50px;
    font-size: 1.3em;
}

.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}

.kiwi-welcome-simple-start[disabled] {
    cursor: not-allowed;
    opacity: 0.65;
}

</style>
