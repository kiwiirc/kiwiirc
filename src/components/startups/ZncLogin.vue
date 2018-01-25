<template>
    <div class="kiwi-welcome-znc" :class="[
        closing ? 'kiwi-welcome-znc--closing' : '',
        backgroundImage ? '' : 'kiwi-welcome-znc--no-bg',
    ]" :style="backgroundStyle">
        <div class="kiwi-welcome-znc-section kiwi-welcome-znc-section-connection">
            <template v-if="!network || network.state === 'disconnected'">
                <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-znc-form">
                    <h2 v-html="greetingText"></h2>
                    <div class="kiwi-welcome-znc-error" v-if="network && network.state_error">We couldn't connect to the server :( <span>{{readableStateError(network.state_error)}}</span></div>

                    <input-text v-if="showUser" class="kiwi-welcome-znc-nick" :label="$t('username')" v-model="username" />
                    <input-text v-if="showPass" class="kiwi-welcome-znc-password" :label="$t('password')" v-model="password" type="password" />
                    <input-text v-if="showNetwork" class="kiwi-welcome-znc-channel" :label="$t('network')" v-model="znc_network" />
                    <button
                        class="u-button u-button-primary u-submit kiwi-welcome-znc-start"
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
          <div class="kiwi-welcome-znc-section kiwi-welcome-znc-section-info" :style="backgroundStyle">
             <div class="kiwi-welcome-znc-section-info-content" v-if="infoContent" v-html="infoContent"></div>
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
            network_extras: null,
            username: '',
            password: '',
            znc_network: '',
            showNetwork: true,
            showPass: true,
            showUser: true,
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
            return this.username && (this.password || this.showPass === false);
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
        addNetwork: function addNetwork(netName) {
            let options = state.settings.startupOptions;
            let password = this.username;
            if (netName) {
                password += '/' + netName;
            }
            password += ':' + this.password;

            let net = state.addNetwork(netName, this.username, {
                server: _.trim(options.server),
                port: options.port,
                tls: options.tls,
                password: password,
                encoding: _.trim(options.encoding),
                direct: !!options.direct,
                path: options.direct_path || '',
                gecos: options.gecos,
            });
            return net;
        },
        startUp: function startUp() {
            let netList = _.compact(this.znc_network.split(','));
            if (netList.length === 0) {
                netList.push('');
            }

            // add our first network and make sure we can connect
            // before trying to add other networks.
            let net = this.network = this.addNetwork(netList.shift());
            this.network_extras = netList;

            let onRegistered = () => {
                state.setActiveBuffer(net.id, net.serverBuffer().name);
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
                this.network_extras.forEach((netName, idx) => {
                    let extraNet = this.addNetwork(_.trim(netName));
                    extraNet.ircClient.connect();
                });
                this.close();
            };
            let onClosed = () => {
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            net.ircClient.once('registered', onRegistered);
            net.ircClient.once('close', onClosed);
            net.ircClient.connect();
        },
    },
    created: function created() {
        let options = state.settings.startupOptions;

        this.username = options.username || '';
        this.password = options.password || '';
        this.znc_network = window.location.hash.substr(1) || options.network || '';
        this.showNetwork = typeof options.showNetwork === 'boolean' ?
            options.showNetwork :
            true;
        this.showUser = typeof options.showUser === 'boolean' ?
            options.showUser :
            true;
        this.showPass = typeof options.showPass === 'boolean' ?
            options.showPass :
            true;

        if (options.autoConnect && this.username && this.password) {
            this.startUp();
        }
    },
};
</script>

<style>

.kiwi-welcome-znc {
    height: 100%;
    text-align: center;
}

.kiwi-welcome-znc h2 {
    font-size: 1.7em;
    text-align: center;
    padding: 0;
    margin: 0.5em 0 1em 0;
}
.kiwi-welcome-znc-section {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50%;
    padding: 1em;
    box-sizing: border-box;
    transition: right 0.3s, left 0.3s;
    overflow-y: auto;
}

.kiwi-welcome-znc-section-connection{
    width: 50%;
    position: relative;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.kiwi-welcome-znc-form {
    width: 300px;
    background-color: #fff;
    border-radius: 0.5em;
    padding: 1em;
    border:1px solid #ececec;
}

/** Right side */
.kiwi-welcome-znc-section-info {
    right: 0;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
}
.kiwi-welcome-znc-section-info-content {
    background: rgba(255, 255, 255, 0.74);
    margin: 2em;
    color: #1b1b1b;
    font-size: 1.5em;
    padding: 2em;
    line-height: 1.6em;
}
/** Left side */
.kiwi-welcome-znc-error {
    text-align: center;
    margin: 1em 0;
    padding: 0.3em;
}
.kiwi-welcome-znc-error span {
    display: block;
    font-style: italic;
}

.kiwi-welcome-znc-section-connection label {
    text-align: left;
    display: inline-block;
    margin-bottom: 0.8em;
    padding: 0 0.5em;
}
.kiwi-welcome-znc-section-connection input[type="text"] {
    font-size: 1em;
    margin-top: 5px;
    padding: 0.3em 1em;
    width: 100%;
    box-sizing: border-box;
}
.kiwi-welcome-znc .input-text{
    font-weight: 600;
    opacity:0.6;
    font-size: 1.2em;
    margin-bottom: 0.8em;
}
.kiwi-welcome-znc .kiwi-welcome-znc-have-password input,
.kiwi-welcome-znc-have-password {
    font-size: 0.8em;
    margin: 0.8em 0;
}
.kiwi-welcome-znc-have-password,
.kiwi-welcome-znc-password.input-text{
    margin-top: 0;
}
.kiwi-welcome-znc-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-znc-start[disabled] {
    cursor: not-allowed;
}
.kiwi-welcome-znc-form input{
    padding: 0.5em;
}
.kiwi-welcome-znc-channel{
    margin-bottom: 0.8em;
}
.kiwi-welcome-znc-form .u-submit{
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
.kiwi-welcome-znc--closing .kiwi-welcome-znc-section-connection {
    left: -50%;
}
.kiwi-welcome-znc--closing .kiwi-welcome-znc-section-info {
    right: -50%;
}
.kiwi-welcome-znc .help{
    position: absolute;
    bottom:0.2em;
    font-size: 0.8em;
    color:#666;
    width: 50%;
    text-align: center;
}
.kiwi-welcome-znc .help a{
    text-decoration: underline;
    color:#666;
}
.kiwi-welcome-znc .help a:hover{
    color:#A9D87A;
}

/* Styling the preloader */
.kiwi-welcome-znc .fa-spinner{
    font-size: 1.5em;
    position: absolute;
    top: 50%;
    z-index: 999;
    font-size: 100px;
    margin-top: -0.5em;
    left: 50%;
    margin-left: -40px;
}

/** Smaller screen...**/
@media screen and (max-width: 850px) {
    .kiwi-welcome-znc {
        font-size: 0.9em;
    }
    .kiwi-startbnc-section-connection {
        margin-top: 1em;
    }
    .kiwi-welcome-znc-section-connection{
      width: 100%;
    }
    .kiwi-welcome-znc-section-info-content {
        margin: 1em;
    }
    .kiwi-welcome-znc-form {
        position: static;
        left: auto;
        margin: 20px auto 20px auto;
        z-index: 100;
        position: relative;
        top:auto;
        align-self: flex-start;
    }
    .kiwi-welcome-znc p.help{
        position: absolute;
        bottom:20px;
        width: 100%;
        color:#fff;
        z-index: 100;
    }
    .kiwi-welcome-znc p.help a{
        color: #fff;
    }

    .kiwi-welcome-znc-section-info{
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
    .kiwi-welcome-znc-section-connection{
      min-height: 400px;
    }

    .kiwi-welcome-znc{
      position: relative;
      min-height: 100%;
    }

    .kiwi-welcome-znc-section .kiwi-welcome-znc-section-connection{
      position: static;
    }

}

/** Even smaller screen.. probably phones **/
@media screen and (max-width: 750px) {
    .kiwi-welcome-znc {
        font-size: 0.9em;
        overflow-y: auto;
    }
    .kiwi-welcome-znc-section-info-content {
        margin: 0.5em;
    }
    /** Closing - the wiping away of the screen **/
    .kiwi-welcome-znc--closing .kiwi-welcome-znc-section-connection {
        left: -100%;
    }
    .kiwi-welcome-znc--closing .kiwi-welcome-znc-section-info {
        left: -100%;
    }
}

@media screen and (max-width: 400px){
    .kiwi-welcome-znc-form {
      width: 90%;
    }
}


/** Background /border switching between screen sizes **/
.kiwi-welcome-znc {
    background-size: 0;
    background-position: bottom;
}
.kiwi-welcome-znc-section-info {
    background-size: cover;
    background-position: bottom;
    border-left: 5px solid #86b32d;
}
.kiwi-welcome-znc--no-bg .kiwi-welcome-znc-section-info {
    background-color: rgb(51, 51, 51);
}
@media screen and (max-width: 850px) {
    /* Apply some flex so that the info panel fills the rest of the bottom screen */
    .kiwi-welcome-znc {
        background-size: cover;
        display: flex;
        flex-direction: column;
    }
    .kiwi-welcome-znc-section {
        overflow-y: visible;
    }
    .kiwi-welcome-znc-section-info {
        background-size: 0;
        border-left: none;
        flex: 1 0;
        display: block;
    }
    .kiwi-welcome-znc--no-bg .kiwi-welcome-znc-section-info {
        border-top: 5px solid #86b32d;
    }
}
</style>
