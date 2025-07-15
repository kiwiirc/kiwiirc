<template>
    <startup-layout ref="layout" class="kiwi-welcome-znc">
        <template v-if="!network || network.state === 'disconnected'" #connection>
            <form class="u-form u-form--big kiwi-welcome-znc-form" @submit.prevent="formSubmit">
                <h2 v-html="greetingText" />
                <div
                    v-if="network && (connectErrors.length > 0 || network.state_error)"
                    class="kiwi-welcome-znc-error"
                >
                    <template v-if="connectErrors.length > 0">
                        <span v-for="err in connectErrors" :key="err">{{ err }}</span>
                    </template>
                    <template v-else>
                        <span>{{ $t('network_noconnect') }}</span>
                        <span>{{ readableStateError(network.state_error) }}</span>
                    </template>
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
                    :show-plain-text="true"
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
        <template v-else-if="network.state !== 'connected'" #connection>
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
    data() {
        return {
            connectErrors: [],
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
        greetingText() {
            let greeting = this.$state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_greeting');
        },
        buttonText() {
            let greeting = this.$state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
        readyToStart() {
            return this.username && (this.password || this.showPass === false);
        },
        infoContent() {
            return this.$state.settings.startupOptions.infoContent || '';
        },
    },
    created() {
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

        window.test = this;
    },
    methods: {
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        formSubmit() {
            if (this.readyToStart) {
                this.startUp();
            }
        },
        addNetwork(netName) {
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
        startUp() {
            this.connectErrors = [];

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
                if (this.$refs.layout) {
                    this.$refs.layout.close();
                }
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
                net.ircClient.off('irc error', onError);
                this.network_extras.forEach((netName, idx) => {
                    let extraNet = this.addNetwork(_.trim(netName));
                    extraNet.ircClient.connect();
                });
            };
            let onClosed = () => {
                let lastError = this.network.last_error;
                if (lastError && !this.connectErrors.includes(lastError)) {
                    this.connectErrors.push(lastError);
                }
                if (!this.connectErrors.length && !net.state_error) {
                    this.connectErrors.push(this.$t('error_closed_unexpected'));
                }
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
                net.ircClient.off('irc error', onError);
            };
            let onError = (event) => {
                if (event.reason && !this.connectErrors.includes(event.reason)) {
                    this.connectErrors.push(event.reason);
                }
            };

            net.ircClient.once('registered', onRegistered);
            net.ircClient.once('close', onClosed);
            net.ircClient.on('irc error', onError);
            net.ircClient.connect();
        },
    },
};
</script>

<style>

form.kiwi-welcome-znc-form {
    width: 70%;
    padding: 20px;
}

@media (max-width: 1025px) {
    form.kiwi-welcome-znc-form {
        width: 100%;
    }
}

@media (max-width: 850px) {
    form.kiwi-welcome-znc-form {
        background: var(--brand-default-bg);
        border-radius: 5px;
        box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.2);
    }
}

@media (max-width: 600px) {
    form.kiwi-welcome-znc-form {
        max-width: 350px;
    }
}

form.kiwi-welcome-znc-form h2 {
    margin: 0 0 40px 0;
    padding: 0;
    cursor: default;
    font-weight: 600;
    font-size: 2.2em;
    text-align: center;
    line-height: 1.2em;
}

.kiwi-welcome-znc-error {
    text-align: center;
    margin: 1em 0;
    padding: 1em;
}

.kiwi-welcome-znc-error span {
    display: block;
    font-style: italic;
    margin-bottom: 8px;
}

.kiwi-welcome-znc-error span:last-of-type {
    margin-bottom: 0;
}

.kiwi-welcome-znc-input-container {
    width: 100%;
    height: auto;
    position: relative;
    margin: 0 0 20px 0;
}

.kiwi-welcome-znc-input-container:last-of-type {
    margin: 20px 0 40px 0;
}

.kiwi-welcome-znc-terms {
    display: flex;
    flex-direction: row;
}

.kiwi-welcome-znc-form .u-submit {
    width: 100%;
    height: 50px;
    font-size: 1.3em;
}

.kiwi-welcome-znc-start {
    font-size: 1.1em;
    cursor: pointer;
}

.kiwi-welcome-znc-start[disabled] {
    cursor: not-allowed;
    opacity: 0.65;
}

</style>
