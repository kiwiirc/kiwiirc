<template>
    <div class="kiwi-welcome-simple" :class="[closing ? 'kiwi-welcome-simple--closing' : '']">
    
        <div class="kiwi-welcome-simple-section kiwi-welcome-simple-section-connection">
            <h2 v-html="greetingText"></h2>

            <template v-if="!network">
                <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-simple-form">
                    <input-text v-if="showUser" class="kiwi-welcome-simple-nick" :label="$t('username')" v-model="username" />
                    <input-text v-if="showPass" class="kiwi-welcome-simple-password" :label="$t('password')" v-model="password" type="password" />
                    <input-text v-if="showNetwork" class="kiwi-welcome-simple-channel" :label="$t('network')" v-model="znc_network" />
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
import state from 'src/libs/state';

export default {
    data: function data() {
        return {
            network: null,
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
                'Welcome to Kiwi IRC!';
        },
        buttonText: function buttonText() {
            let greeting = state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                'Start';
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
        startUp: function startUp() {
            let options = state.settings.startupOptions;

            let sNets = _.compact(this.znc_network.split(','));
            if (sNets.length === 0) {
                sNets.push('');
            }
            sNets.forEach((newNet, idx) => {
                let password = this.username;
                if (newNet) {
                    password += '/' + newNet;
                }
                if (this.password) {
                    password += ':' + this.password;
                }

                let net = this.network = state.addNetwork(this.netNet, this.username, {
                    server: _.trim(options.server),
                    port: options.port,
                    tls: options.tls,
                    password: password,
                });

                if (sNets.length === 1) {
                    let onRegistered = () => {
                        this.close();
                        net.ircClient.off('registered', onRegistered);
                        net.ircClient.off('close', onClosed);
                    };
                    let onClosed = () => {
                        setTimeout(() => { this.network = null; }, 1000);
                        net.ircClient.off('registered', onRegistered);
                        net.ircClient.off('close', onClosed);
                    };
                    net.ircClient.once('registered', onRegistered);
                    net.ircClient.once('close', onClosed);
                } else if (idx === 0) {
                    let onRegistered = () => {
                        state.setActiveBuffer(net.id, net.serverBuffer().name);
                        net.ircClient.off('registered', onRegistered);
                    };
                    net.ircClient.once('registered', onRegistered);
                }

                net.ircClient.connect();
            });
            if (sNets.length > 1) {
                this.close();
            }
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

.kiwi-welcome-simple {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow-y: auto;
    box-sizing: border-box;
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
.kiwi-welcome-simple-section-connection {
    left: 0;
    padding-top: 3em;
    font-size: 1.2em;
    display: flex;
    flex-direction: column;
    justify-content: center;
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

.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-simple-form {
    width: 300px;
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
