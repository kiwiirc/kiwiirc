<template>
    <div class="kiwi-welcome-simple" :class="[closing ? 'kiwi-welcome-simple--closing' : '']">

        <div class="kiwi-welcome-simple-section kiwi-welcome-simple-section-connection">
            <h2 v-html="greetingText"></h2>

            <template v-if="!network || network.state === 'disconnected'">
                <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-simple-form">
                    <div class="kiwi-welcome-simple-error" v-if="network && network.state_error">We couldn't connect to the server :( <span>{{readableStateError(network.state_error)}}</span></div>

                    <input-text v-if="showNick" class="kiwi-welcome-simple-nick" :label="$t('nick')" v-model="nick" />
                    <label v-if="showPass" class="kiwi-welcome-simple-have-password">
                        <input type="checkbox" v-model="show_password_box" /> {{$t('password_have')}}
                    </label>
                    <input-text v-if="show_password_box" class="kiwi-welcome-simple-password" :label="$t('password')" v-model="password" type="password" />
                    <input-text v-if="showChannel" class="kiwi-welcome-simple-channel" :label="$t('channel')" v-model="channel" />
                    <button
                        class="u-button u-button-primary u-submit kiwi-welcome-simple-start"
                        type="submit"
                        v-html="buttonText"
                        :disabled="!readyToStart"
                    ></button>
                </form>
            </template>
            <template v-else-if="network.state !== 'connected'">
                <i class="fa fa-spin fa-spinner" style="font-size:2em; margin-top:1em;" aria-hidden="true"></i>
            </template>
        </div>

        <div class="kiwi-welcome-simple-section kiwi-welcome-simple-section-info" :style="infoStyle">
            <div class="kiwi-welcome-simple-section-info-content" v-if="infoContent" v-html="infoContent"></div>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import state from '@/libs/state';

export default {
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
            closing: false,
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
        infoStyle: function infoStyle() {
            let style = {};
            let options = state.settings.startupOptions;

            if (options.infoBackground) {
                style['background-image'] = `url(${options.infoBackground})`;
            } else {
                style['background-color'] = '#333333';
            }

            return style;
        },
        infoContent: function infoContent() {
            return state.settings.startupOptions.infoContent || '';
        },
    },
    methods: {
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        close: function close() {
            this.closing = true;
            this.$el.addEventListener('transitionend', (event) => {
                state.persistence.watchStateForChanges();
                this.$emit('start');
            }, false);
        },
        formSubmit: function formSubmit() {
            if (this.readyToStart) {
                this.startUp();
            }
        },
        startUp: function startUp() {
            let options = state.settings.startupOptions;

            let net;
            if (!this.network) {
                net = this.network = state.addNetwork('Network', this.nick, {
                    server: _.trim(options.server),
                    port: options.port,
                    tls: options.tls,
                    password: this.password,
                    encoding: _.trim(options.encoding),
                    direct: !!options.direct,
                    path: options.direct_path || '',
                    gecos: options.gecos,
                });
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
                this.close();
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
        this.channel = window.location.hash || options.channel || '';
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
    },
};
</script>

<style>

.kiwi-welcome-simple {
    height: 100%;
    text-align: center;
}

.kiwi-welcome-simple h2 {
    margin-bottom: 1.5em;
}

.kiwi-welcome-simple-section {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    padding: 1em;
    box-sizing: border-box;
    transition: right 0.3s, left 0.3s;
    overflow-y: auto;
}


/** Right side */
.kiwi-welcome-simple-section-info {
    right: 0;
    border: 0 solid #86b32d;
    border-left-width: 5px;
    background-size: cover;
    color: #fff;
    background-position: bottom;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
}
.kiwi-welcome-simple-section-info-content {
    background: rgba(255, 255, 255, 0.74);
    margin: 2em;
    color: #1b1b1b;
    font-size: 1.5em;
    padding: 2em;
    line-height: 1.6em;
}


/** Left side */
.kiwi-welcome-simple-error {
    text-align: center;
    margin: 1em 0;
    padding: 0.3em;
}
.kiwi-welcome-simple-error span {
    display: block;
    font-style: italic;
}

.kiwi-welcome-simple-section-connection {
    left: 0;
    padding-top: 3em;
    font-size: 1.2em;
}

.kiwi-welcome-simple-section-connection label {
    text-align: left;
    display: inline-block;
    margin-bottom: 1.5em;
}
.kiwi-welcome-simple-section-connection input[type="text"] {
    font-size: 1em;
    margin-top: 5px;
    padding: 0.3em 1em;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-welcome-simple .input-text,
.kiwi-welcome-simple .kiwi-welcome-simple-have-password input {
    margin-bottom: 1.5em;
}
.kiwi-welcome-simple-have-password input:checked {
    margin-bottom: 0;
}

.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-simple-start[disabled] {
    cursor: not-allowed;
}
.kiwi-welcome-simple-form {
    max-width: 300px;
    margin: 2em auto;
}

/** Closing - the wiping away of the screen **/
.kiwi-welcome-simple--closing .kiwi-welcome-simple-section-connection {
    left: -50%;
}
.kiwi-welcome-simple--closing .kiwi-welcome-simple-section-info {
    right: -50%;
}

/** Smaller screen...**/
@media screen and (max-width: 850px) {
    .kiwi-welcome-simple {
        font-size: 0.9em;
    }

    .kiwi-startbnc-section-connection {
        margin-top: 1em;
    }
    .kiwi-welcome-simple-section-info-content {
        margin: 1em;
    }
}

/** Even smaller screen.. probably phones **/
@media screen and (max-width: 750px) {
    .kiwi-welcome-simple {
        font-size: 0.9em;
        overflow-y: auto;
    }

    .kiwi-welcome-simple-section {
        left: 0;
        width: 100%;
        right: auto;
        position: relative;
    }

    .kiwi-welcome-simple-section-info {
        border-width: 5px 0 0 0;
    }
    .kiwi-welcome-simple-section-info-content {
        margin: 0.5em;
    }

    /** Closing - the wiping away of the screen **/
    .kiwi-welcome-simple--closing .kiwi-welcome-simple-section-connection {
        left: -100%;
    }
    .kiwi-welcome-simple--closing .kiwi-welcome-simple-section-info {
        left: -100%;
    }
}
</style>
