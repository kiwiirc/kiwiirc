<template>
    <startup-layout ref="layout"
                    :class="{ 'kiwi-welcome-simple--recaptcha': recaptchaSiteId }"
                    class="kiwi-welcome-simple"
    >
        <template v-slot:connection v-if="!network || network.state === 'disconnected'">
            <form class="u-form u-form--big kiwi-welcome-simple-form" @submit.prevent="formSubmit">
                <h2 v-html="greetingText"/>
                <div
                    v-if="network && (network.last_error || network.state_error)"
                    class="kiwi-welcome-simple-error"
                >
                    We couldn't connect to the server :(
                    <span>
                        {{ network.last_error || readableStateError(network.state_error) }}
                    </span>
                </div>

                <input-text v-model="nick" :label="$t('nick')" type="text" />

                <div v-if="showPass && toggablePass" class="kiwi-welcome-simple-input-container">
                    <label
                        class="kiwi-welcome-simple-have-password"
                    >
                        <input v-model="show_password_box" type="checkbox" >
                        <span> {{ $t('password_have') }} </span>
                    </label>
                </div>

                <div v-if="showPass && (show_password_box || !toggablePass)"
                     class="kiwi-welcome-simple-input-container"
                >
                    <input-text
                        v-focus
                        v-model="password"
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

                <div
                    v-if="recaptchaSiteId"
                    :data-sitekey="recaptchaSiteId"
                    class="g-recaptcha"
                />

                <button
                    :disabled="!readyToStart"
                    class="u-button u-button-primary u-submit kiwi-welcome-simple-start"
                    type="submit"
                    v-html="buttonText"
                />
            </form>
        </template>
        <template v-slot:connection v-else>
            <i class="fa fa-spin fa-spinner" aria-hidden="true"/>
        </template>
    </startup-layout>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import state from '@/libs/state';
import Logger from '@/libs/Logger';
import BouncerProvider from '@/libs/BouncerProvider';
import StartupLayout from './CommonLayout';

let log = Logger.namespace('Welcome.vue');

export default {
    components: {
        StartupLayout,
    },
    data: function data() {
        return {
            network: null,
            channel: '',
            nick: '',
            password: '',
            showChannel: true,
            showPass: true,
            toggablePass: true,
            showNick: true,
            show_password_box: false,
            recaptchaSiteId: '',
            recaptchaResponseCache: '',
            connectWithoutChannel: false,
            showPlainText: false,
        };
    },
    computed: {
        greetingText: function greetingText() {
            let greeting = state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_greeting');
        },
        buttonText: function buttonText() {
            let greeting = state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
        readyToStart: function readyToStart() {
            let ready = !!this.nick;

            if (!this.connectWithoutChannel && !this.channel) {
                ready = false;
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
        let options = state.settings.startupOptions;

        // Take some settings from a previous network if available
        let previousNet = null;
        if (options.server.trim()) {
            previousNet = state.getNetworkFromAddress(options.server.trim());
        }

        if (Misc.queryStringVal('nick')) {
            this.nick = Misc.queryStringVal('nick');
        } else if (previousNet && previousNet.connection.nick) {
            this.nick = previousNet.connection.nick;
        } else {
            this.nick = options.nick;
        }

        this.nick = this.processNickRandomNumber(this.nick || '');
        this.password = options.password || '';
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
            bouncer.enable(options.server, options.port, options.tls, options.direct, options.path);
        }

        if (options.autoConnect && this.nick && (this.channel || this.connectWithoutChannel)) {
            this.startUp();
        }

        this.recaptchaSiteId = options.recaptchaSiteId || '';
    },
    mounted() {
        if (this.recaptchaSiteId) {
            let scr = document.createElement('script');
            scr.src = 'https://www.google.com/recaptcha/api.js';
            this.$el.appendChild(scr);
        }
    },
    methods: {
        captchaSuccess() {
            if (!this.recaptchaSiteId) {
                return true;
            }

            return !!this.captchaResponse();
        },
        captchaResponse() {
            // Cache the response code since the recaptcha UI may not be here if we come back to
            // this screen after an IRC connection fail
            if (this.recaptchaResponseCache) {
                return this.recaptchaResponseCache;
            }

            let gEl = this.$el.querySelector('#g-recaptcha-response');
            this.recaptchaResponseCache = gEl ?
                gEl.value :
                '';

            return this.recaptchaResponseCache;
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
            let options = Object.assign({}, state.settings.startupOptions);

            // If a server isn't specified in the config, set some defaults
            // The webircgateway will have a default network set and will connect
            // there instead. This just removes the requirement of specifying the same
            // irc network address in both the server-side and client side configs
            options.server = options.server || 'default';
            options.port = options.port || 6667;

            if (!this.captchaSuccess()) {
                return;
            }

            let netAddress = _.trim(options.server);

            // Check if we have this network already
            let net = this.network || state.getNetworkFromAddress(netAddress);

            let password = this.password;
            if (options.bouncer) {
                password = `${this.nick}:${this.password}`;
            }

            // If the network doesn't already exist, add a new one
            net = net || state.addNetwork('Network', this.nick, {
                server: netAddress,
                port: options.port,
                tls: options.tls,
                password: password,
                encoding: _.trim(options.encoding),
                direct: !!options.direct,
                path: options.direct_path || '',
                gecos: options.gecos,
            });

            // If we retreived an existing network, update the nick+password with what
            // the user has just put in place
            net.connection.nick = this.nick;
            net.password = password;

            if (_.trim(options.encoding || '')) {
                net.connection.encoding = _.trim(options.encoding);
            }

            if (!this.network && options.recaptchaSiteId) {
                net.captchaResponse = this.captchaResponse();
            }
            this.network = net;

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            let bufferObjs = Misc.extractBuffers(this.channel);
            bufferObjs.forEach((bufferObj) => {
                let newBuffer = state.addBuffer(net.id, bufferObj.name);
                newBuffer.enabled = true;

                if (newBuffer && !hasSwitchedActiveBuffer) {
                    state.setActiveBuffer(net.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }

                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }
            });

            // switch to server buffer if no channels are joined
            if (!hasSwitchedActiveBuffer) {
                state.setActiveBuffer(net.id, net.serverBuffer().name);
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
    },
};
</script>

<style>

/* Containers */
form.kiwi-welcome-simple-form {
    width: 70%;
    padding: 0 20px;
}

@media (max-width: 1025px) {
    form.kiwi-welcome-simple-form {
        width: 100%;
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
    padding: 0.3em;
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

/* Make the preloader icon larger */
.kiwi-welcome-simple .fa-spinner {
    font-size: 6em;
}

</style>
