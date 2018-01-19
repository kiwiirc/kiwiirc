<template>
    <div class="kiwi-welcome-simple" :class="[
        closing ? 'kiwi-welcome-simple--closing' : '',
        backgroundImage ? '' : 'kiwi-welcome-simple--no-bg',
    ]" :style="backgroundStyle">
        <div class="kiwi-welcome-simple-section kiwi-welcome-simple-section-connection">
            <template v-if="!network || network.state === 'disconnected'">
                <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-simple-form">
                    <h2 v-html="greetingText"></h2>
                    <div class="kiwi-welcome-simple-error" v-if="network && network.state_error">We couldn't connect to the server :( <span>{{readableStateError(network.state_error)}}</span></div>

                    <input-text v-if="showNick" class="kiwi-welcome-simple-nick" :label="$t('nick')" v-model="nick" />
                    <label v-if="showPass" class="kiwi-welcome-simple-have-password">
                        <input type="checkbox" v-model="show_password_box" /> {{$t('password_have')}}
                    </label>
                    <input-text v-if="show_password_box" class="kiwi-welcome-simple-password input-text--reveal-value" :label="$t('password')" v-model="password" type="password" />
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
                <i class="fa fa-spin fa-spinner" aria-hidden="true"></i>
            </template>
          </div>
          <p class='help'></p>
          <div class="kiwi-welcome-simple-section kiwi-welcome-simple-section-info" :style="backgroundStyle">
             <div class="kiwi-welcome-simple-section-info-content" v-if="infoContent" v-html="infoContent"></div>
         </div>
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
        backgroundStyle() {
            let style = {};
            let options = state.settings.startupOptions;

            if (options.infoBackground) {
                style['background-image'] = `url(${options.infoBackground})`;
            }
            return style;
        },
        backgroundImage() {
            return state.settings.startupOptions.infoBackground || '';
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
    font-size: 1.7em;
    text-align: center;
    padding: 0;
    margin: 0.5em 0 1em 0;
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

.kiwi-welcome-simple-section-connection{
    width: 50%;
    position: relative;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.kiwi-welcome-simple-form {
    width: 300px;
    background-color: #fff;
    border-radius: 0.5em;
    padding: 1em;
    border:1px solid #ececec;
}

/** Right side */
.kiwi-welcome-simple-section-info {
    right: 0;
    color: #fff;
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

.kiwi-welcome-simple-section-connection label {
    text-align: left;
    display: inline-block;
    margin-bottom: 0.8em;
    padding: 0 0.5em;
}
.kiwi-welcome-simple-section-connection input[type="text"] {
    font-size: 1em;
    margin-top: 5px;
    padding: 0.3em 1em;
    width: 100%;
    box-sizing: border-box;
}
.kiwi-welcome-simple .input-text{
    font-weight: 600;
    opacity:0.6;
    font-size: 1.2em;
    margin-bottom: 0.8em;
}
.kiwi-welcome-simple .kiwi-welcome-simple-have-password input,
.kiwi-welcome-simple-have-password {
    font-size: 0.8em;
    margin: 0.8em 0;
}
.kiwi-welcome-simple-have-password,
.kiwi-welcome-simple-password.input-text{
    margin-top: 0;
}
.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-simple-start[disabled] {
    cursor: not-allowed;
}
.kiwi-welcome-simple-form input{
    padding: 0.5em;
}
.kiwi-welcome-simple-channel{
    margin-bottom: 0.8em;
}
.kiwi-welcome-simple-form .u-submit{
    width: 100%;
    line-height: 50px;
    padding: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 400;
    text-shadow: none;
    margin: 0;
    transition: all 0.2s;
    border:none;
    background-color: #86b32d;
}
/** Closing - the wiping away of the screen **/
.kiwi-welcome-simple--closing .kiwi-welcome-simple-section-connection {
    left: -50%;
}
.kiwi-welcome-simple--closing .kiwi-welcome-simple-section-info {
    right: -50%;
}
.kiwi-welcome-simple .help{
    position: absolute;
    bottom:0.2em;
    font-size: 0.8em;
    color:#666;
    width: 50%;
    text-align: center;
}
.kiwi-welcome-simple .help a{
    text-decoration: underline;
    color:#666;
}
.kiwi-welcome-simple .help a:hover{
    color:#A9D87A;
}

/* Styling the preloader */
.kiwi-welcome-simple .fa-spinner{
    font-size: 1.5em;
    position: absolute;
    top: 50%;
    z-index: 999;
    font-size: 100px;
    margin-top: -0.5em;
    left: 50%;
    margin-left: -40px;
}


/** Background /border switching between screen sizes **/
.kiwi-welcome-simple {
    background-size: 0;
    background-position: bottom;
}
.kiwi-welcome-simple-section-info {
    background-size: cover;
    background-position: bottom;
    border-left: 5px solid #86b32d;
}
.kiwi-welcome-simple--no-bg .kiwi-welcome-simple-section-info {
    background-color: rgb(51, 51, 51);
}
@media screen and (max-width: 850px) {
    /* Apply some flex so that the info panel fills the rest of the bottom screen */
    .kiwi-welcome-simple {
        background-size: cover;
        display: flex;
        flex-direction: column;
    }
    .kiwi-welcome-simple-section-info {
        background-size: 0;
        border-left: none;
        flex-grow: 1;
    }
    .kiwi-welcome-simple--no-bg .kiwi-welcome-simple-section-info {
        border-top: 5px solid #86b32d;
    }
}

/** Smaller screen...**/
@media screen and (max-width: 850px) {
    .kiwi-welcome-simple {
        font-size: 0.9em;
    }
    .kiwi-startbnc-section-connection {
        margin-top: 1em;
    }
    .kiwi-welcome-simple-section-connection{
      width: 100%;
    }
    .kiwi-welcome-simple-section-info-content {
        margin: 1em;
    }
    .kiwi-welcome-simple-form {
        position: static;
        left: auto;
        margin: 20px auto 20px auto;
        z-index: 100;
        position: relative;
        top:auto;
        align-self: flex-start;
    }
    .kiwi-welcome-simple p.help{
        position: absolute;
        bottom:20px;
        width: 100%;
        color:#fff;
        z-index: 100;
    }
    .kiwi-welcome-simple p.help a{
        color: #fff;
    }

    .kiwi-welcome-simple-section-info{
      position: static;
      width: 100%;
      border: none;
      min-height: 0px;
    }

    .fa-spinner{
        position: absolute;
        left: 48%;
        top: 50%;
        margin-top: -50px;
        color: #fff;
    }
    .kiwi-welcome-simple-section-connection{
      min-height: 400px;
    }

    .kiwi-welcome-simple{
      position: relative;
      min-height: 100%;
    }

    .kiwi-welcome-simple-section .kiwi-welcome-simple-section-connection{
      position: static;
    }

}

/** Even smaller screen.. probably phones **/
@media screen and (max-width: 750px) {
    .kiwi-welcome-simple {
        font-size: 0.9em;
        overflow-y: auto;
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

@media screen and (max-width: 400px){
    .kiwi-welcome-simple-form {
      width: 90%;
    }
}
</style>
