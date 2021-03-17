<template>
    <startup-layout ref="layout" class="kiwi-welcome-znc">
        <template v-if="!network || network.state === 'disconnected'" v-slot:connection>
            <form class="u-form u-form--big kiwi-welcome-znc-form" @submit.prevent="formSubmit">
                <h2 v-html="greetingText" />

                <div
                    v-if="network && (network.last_error || network.state_error)"
                    class="kiwi-welcome-znc-error"
                >
                    We couldn't connect to the server :(
                    <span>
                        {{ network.last_error || readableStateError(network.state_error) }}
                    </span>
                </div>

                <input-text
                    v-if="showUser"
                    v-model="username"
                    :label="$t('username')"
                    class="kiwi-welcome-znc-nick"
                />
                <input-text
                    v-if="showPass"
                    v-model="password"
                    :label="$t('password')"
                    class="kiwi-welcome-znc-password"
                    type="password"
                />
                <input-text
                    v-if="showNetwork"
                    v-model="znc_network"
                    :label="$t('network')"
                    class="kiwi-welcome-znc-channel"
                />
                <button
                    :disabled="!readyToStart"
                    class="u-button u-button-primary u-submit kiwi-welcome-znc-start"
                    type="submit"
                    v-html="buttonText"
                />
            </form>
        </template>
        <template v-else-if="network.state !== 'connected'" v-slot:connection>
            <i class="fa fa-spin fa-spinner" style="font-size: 2em; margin-top: 1em;" />
        </template>
    </startup-layout>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import StartupLayout from './CommonLayout';

export default {
    components: {
        StartupLayout,
    },
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
        };
    },
    computed: {
        greetingText: function greetingText() {
            let greeting = this.$state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_greeting');
        },
        buttonText: function buttonText() {
            let greeting = this.$state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
        readyToStart: function readyToStart() {
            return this.username && (this.password || this.showPass === false);
        },
        infoContent: function infoContent() {
            return this.$state.settings.startupOptions.infoContent || '';
        },
    },
    created: function created() {
        let options = this.$state.settings.startupOptions;

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
    methods: {
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        formSubmit: function formSubmit() {
            if (this.readyToStart) {
                this.startUp();
            }
        },
        addNetwork: function addNetwork(netName) {
            let options = this.$state.settings.startupOptions;
            let password = this.username;
            if (netName) {
                password += '/' + netName;
            }
            password += ':' + this.password;

            let net = this.$state.addNetwork(netName, 'ZNC', {
                server: _.trim(options.server),
                port: options.port,
                tls: options.tls,
                password: password,
            });
            return net;
        },
        startUp: function startUp() {
            if (this.network) {
                this.$state.removeNetwork(this.network.id);
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
                this.$state.setActiveBuffer(net.id, net.serverBuffer().name);
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
                this.network_extras.forEach((netName, idx) => {
                    let extraNet = this.addNetwork(_.trim(netName));
                    extraNet.ircClient.connect();
                });
                this.$refs.layout.close();
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
};
</script>

<style>

.kiwi-welcome-znc h2 {
    font-size: 1.7em;
    text-align: center;
    padding: 0;
    margin: 0.5em auto 1.5em auto;
}

.kiwi-welcome-znc-error {
    text-align: center;
    margin: 1em 0;
    padding: 0.3em;
}

.kiwi-welcome-znc-error span {
    display: block;
    font-style: italic;
}

.kiwi-welcome-znc-form {
    width: 300px;
    background-color: #fff;
    border-radius: 0.5em;
    padding: 1em;
    border: 1px solid #ececec;
}

.kiwi-welcome-znc .u-input-text,
.kiwi-welcome-znc .kiwi-welcome-znc-have-password input {
    margin-bottom: 1.5em;
}

.kiwi-welcome-znc-have-password input:checked {
    margin-bottom: 0;
}

.kiwi-welcome-znc-start {
    font-size: 1.1em;
    cursor: pointer;
    width: 100%;
    margin: 1em auto 0.5em auto;
    font-weight: normal;
    border: none;
    height: 36px;
    line-height: 36px;
    padding: 0;
}

.kiwi-welcome-znc-start[disabled] {
    cursor: not-allowed;
}

</style>
