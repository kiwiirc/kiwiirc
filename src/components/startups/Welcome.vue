<template>
    <startup-layout class="kiwi-welcome-simple" ref="layout">
        <div slot="connection">
            <template v-if="!network || network.state === 'disconnected'">
                <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-simple-form">
                    <h2 v-html="greetingText"></h2>
                    <div class="kiwi-welcome-simple-error" v-if="network && (network.last_error || network.state_error)">We couldn't connect to the server :( <span>{{network.last_error || readableStateError(network.state_error)}}</span></div>

                    <input-text v-if="showNick" class="kiwi-welcome-simple-nick" :label="$t('nick')" v-model="nick" />
                    <label v-if="showPass" class="kiwi-welcome-simple-have-password">
                        <input type="checkbox" v-model="show_password_box" /> <span> {{$t('password_have')}} </span>
                    </label>
                    <input-text v-focus v-if="show_password_box" class="kiwi-welcome-simple-password input-text--reveal-value" :label="$t('password')" v-model="password" type="password" />
                    <input-text v-if="showChannel" class="kiwi-welcome-simple-channel" :label="$t('channel')" v-model="channel" />

                    <div v-if="recaptchaSiteId" class="g-recaptcha" :data-sitekey="recaptchaSiteId"></div>
                    <button
                        class="u-button u-button-primary u-submit kiwi-welcome-simple-start"
                        type="submit"
                        v-html="buttonText"
                        :disabled="!readyToStart"
                    ></button>
                </form>
            </template>
            <template v-else-if="network.state !== 'connected'">
                <i class="fa fa-spin fa-spinner" aria-hidden="true"></i>
            </template>
        </div>
    </startup-layout>
</template>

<script>

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import state from '@/libs/state';
import StartupLayout from './CommonLayout';

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
            showNick: true,
            show_password_box: false,
            recaptchaSiteId: '',
            recaptchaResponseCache: '',
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
            let ready = this.channel && this.nick;
            // Nicks cannot start with [0-9- ]
            // ? is not a valid nick character but we allow it as it gets replaced
            // with a number.
            if (!this.nick.match(/^[a-z_\\[\]{}^`|][a-z0-9_\-\\[\]{}^`|]*$/i)) {
                ready = false;
            }

            return ready;
        },
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

            let net;
            if (!this.network) {
                let netAddress = _.trim(options.server);

                // Check if we have this network already
                net = state.getNetworkFromAddress(netAddress);

                // If we retreived an existing network, update the nick+password with what
                // the user has just put in place
                if (net) {
                    net.nick = this.nick;
                    net.connection.password = this.password;
                }

                // If the network doesn't already exist, add a new one
                net = net || state.addNetwork('Network', this.nick, {
                    server: netAddress,
                    port: options.port,
                    tls: options.tls,
                    password: this.password,
                    encoding: _.trim(options.encoding),
                    direct: !!options.direct,
                    path: options.direct_path || '',
                    gecos: options.gecos,
                });

                if (options.recaptchaSiteId) {
                    net.captchaResponse = this.captchaResponse();
                }
                this.network = net;
            } else {
                net = this.network;
            }

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            let bufferObjs = Misc.extractBuffers(this.channel);
            bufferObjs.forEach(bufferObj => {
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
                this.$refs.layout.close();
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
    created: function created() {
        let options = state.settings.startupOptions;

        this.nick = this.processNickRandomNumber(Misc.queryStringVal('nick') || options.nick || '');
        this.password = options.password || '';
        this.channel = decodeURI(window.location.hash) || options.channel || '';
        this.showChannel = typeof options.showChannel === 'boolean' ?
            options.showChannel :
            true;
        this.showNick = typeof options.showNick === 'boolean' ?
            options.showNick :
            true;
        this.showPass = typeof options.showPassword === 'boolean' ?
            options.showPassword :
            true;

        if (options.autoConnect && this.nick && this.channel) {
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
    border-radius: 0.5em;
    padding: 1em;
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

.kiwi-welcome-simple-section-connection .input-text input[type="text"] {
    margin-top: 5px;
    padding: 0.3em 1em;
    width: 100%;
    font-size: 1.1em;
    box-sizing: border-box;
}

.kiwi-welcome-simple .input-text {
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

.kiwi-welcome-simple .g-recaptcha {
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
        color: #fff;
    }
}

@media (max-width: 400px) {
    .kiwi-welcome-simple-form {
        width: 90%;
    }
}

</style>
