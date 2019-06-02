<template>
    <startup-layout ref="layout"
                    :class="{ 'kiwi-welcome-simple--recaptcha': recaptchaSiteId }"
                    class="kiwi-welcome-simple"
    >
        <template v-slot:connection v-if="!network || network.state === 'disconnected'">
            <form class="u-form kiwi-welcome-simple-form" @submit.prevent="formSubmit">
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

                <input-text
                    v-if="showNick"
                    :label="$t('nick')"
                    v-model="nick"
                    class="kiwi-welcome-simple-nick"
                />
                <label
                    v-if="showPass && toggablePass"
                    class="kiwi-welcome-simple-have-password"
                >
                    <input v-model="show_password_box" type="checkbox" >
                    <span> {{ $t('password_have') }} </span>
                </label>
                <input-text
                    v-focus
                    v-if="showPass && (show_password_box || !toggablePass)"
                    :label="$t('password')"
                    v-model="password"
                    class="kiwi-welcome-simple-password u-input-text--reveal-value"
                    type="password"
                />
                <input-text
                    v-if="showChannel"
                    :label="$t('channel')"
                    v-model="channel"
                    class="kiwi-welcome-simple-channel"
                />

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
        <template v-slot:connection v-else-if="network.state !== 'connected'">
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
        } else if (previousNet && previousNet.nick) {
            this.nick = previousNet.nick;
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
            let options = state.settings.startupOptions;

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

.kiwi-welcome-simple h2 {
    font-size: 1.7em;
    text-align: center;
    padding: 0;
    margin: 0.5em 0 1em 0;
}

.kiwi-welcome-simple-form {
    width: 90%;
    max-width: 250px;
    border-radius: 0.5em;
    padding: 1em;
}

.kiwi-welcome-simple--recaptcha .kiwi-welcome-simple-form {
    width: 333px;
    max-width: 333px;
    box-sizing: border-box;
}

.g-recaptcha {
    margin-bottom: 10px;
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

.kiwi-welcome-simple-section-connection label {
    text-align: left;
    display: inline-block;
    margin-bottom: 0.8em;
    padding: 0 0.5em;
}

.kiwi-welcome-simple-section-connection .u-input-text input[type="text"] {
    margin-top: 5px;
    padding: 0.3em 1em;
    width: 100%;
    font-size: 1.1em;
    box-sizing: border-box;
}

.kiwi-welcome-simple .u-input-text {
    font-weight: 600;
    opacity: 0.6;
    font-size: 1.2em;
    margin-bottom: 0.8em;
}

.kiwi-welcome-simple-form input {
    padding: 0.5em;
}

.kiwi-welcome-simple-have-password input {
    font-size: 0.8em;
    margin: 0.8em 0;
    margin-top: 2px;
}

.kiwi-welcome-simple .kiwi-g-recaptcha {
    margin-bottom: 10px;
}

.kiwi-welcome-simple .u-form label span {
    font-size: 1.1em;
    margin-left: 5px;
}

.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}

.kiwi-welcome-simple-start[disabled] {
    cursor: not-allowed;
    opacity: 0.65;
}

.kiwi-welcome-simple-channel {
    margin-bottom: 0.8em;
}

.kiwi-welcome-simple-form .u-submit {
    width: 100%;
    line-height: 50px;
    padding: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 400;
    text-shadow: none;
    margin: 0;
    transition: all 0.2s;
    border: none;
}

.kiwi-welcome-simple .help {
    position: absolute;
    bottom: 0.2em;
    font-size: 0.8em;
    width: 50%;
    text-align: center;
}

.kiwi-welcome-simple .help a {
    text-decoration: underline;
}

/* Styling the preloader */
.kiwi-welcome-simple .fa-spinner {
    position: absolute;
    top: 50%;
    z-index: 999;
    font-size: 100px;
    margin-top: -0.5em;
    left: 50%;
    margin-left: -40px;
    color: black;
}

/** Smaller screen... **/
@media screen and (max-width: 850px) {
    .kiwi-welcome-simple-form {
        left: auto;
        margin: 20px auto 20px auto;
        z-index: 100;
        position: relative;
        top: auto;
        align-self: flex-start;
    }

    .kiwi-welcome-simple p.help {
        position: absolute;
        bottom: 20px;
        width: 100%;
        color: #fff;
        z-index: 100;
    }

    .kiwi-welcome-simple p.help a {
        color: #fff;
    }

    .fa-spinner {
        position: absolute;
        left: 48%;
        top: 50%;
        margin-top: -50px;
    }
}

@media (max-width: 400px) {
    .kiwi-welcome-simple-form {
        width: 90%;
    }
}

</style>
