<template>
    <div class="kiwi-welcome-znc" :class="[closing ? 'kiwi-welcome-znc--closing' : '']">

        <div class="kiwi-welcome-znc-section kiwi-welcome-znc-section-connection">
            <h2 v-html="greetingText"></h2>

            <template v-if="!network || network.state === 'disconnected'"">
                <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-znc-form">
                    <div class="kiwi-welcome-znc-error" v-if="network && network.state === 'disconnected'">We couldn't connect to the server :( <span>{{readableStateError(network.state_error)}}</span></div>

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
                <i class="fa fa-spin fa-spinner" style="font-size:2em; margin-top:1em;" aria-hidden="true"></i>
            </template>
        </div>

        <div class="kiwi-welcome-znc-section kiwi-welcome-znc-section-info" :style="infoStyle">
            <div class="kiwi-welcome-znc-section-info-content" v-if="infoContent" v-html="infoContent"></div>
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
            });
            return net;
        },
        startUp: function startUp() {
            if (this.network) {
                state.removeNetwork(this.network.id);
            }

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
    margin-bottom: 1.5em;
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


/** Right side */
.kiwi-welcome-znc-section-info {
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

.kiwi-welcome-znc-section-connection {
    left: 0;
    padding-top: 3em;
    font-size: 1.2em;
}

.kiwi-welcome-znc-section-connection label {
    text-align: left;
    display: inline-block;
    margin-bottom: 1.5em;
}
.kiwi-welcome-znc-section-connection input[type="text"] {
    font-size: 1em;
    margin-top: 5px;
    padding: 0.3em 1em;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-welcome-znc .input-text,
.kiwi-welcome-znc .kiwi-welcome-znc-have-password input {
    margin-bottom: 1.5em;
}
.kiwi-welcome-znc-have-password input:checked {
    margin-bottom: 0;
}

.kiwi-welcome-znc-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-znc-start[disabled] {
    cursor: not-allowed;
}
.kiwi-welcome-znc-form {
    max-width: 300px;
    margin: 2em auto;
}

/** Closing - the wiping away of the screen **/
.kiwi-welcome-znc--closing .kiwi-welcome-znc-section-connection {
    left: -50%;
}
.kiwi-welcome-znc--closing .kiwi-welcome-znc-section-info {
    right: -50%;
}

/** Smaller screen...**/
@media screen and (max-width: 850px) {
    .kiwi-welcome-znc {
        font-size: 0.9em;
    }

    .kiwi-startbnc-section-connection {
        margin-top: 1em;
    }
    .kiwi-welcome-znc-section-info-content {
        margin: 1em;
    }
}

/** Even smaller screen.. probably phones **/
@media screen and (max-width: 750px) {
    .kiwi-welcome-znc {
        font-size: 0.9em;
        overflow-y: auto;
    }

    .kiwi-welcome-znc-section {
        left: 0;
        width: 100%;
        right: auto;
        position: relative;
    }

    .kiwi-welcome-znc-section-info {
        border-width: 5px 0 0 0;
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
</style>
