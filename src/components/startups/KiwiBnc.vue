<template>
    <startup-layout ref="layout" class="kiwi-startbnc">
        <template v-slot:connection>
            <form class="kiwi-startbnc-form" @submit.prevent="startUp">
                <h2 v-html="greetingText"/>

                <div class="kiwi-startbnc-status">{{ statusMessage }}</div>

                <label>
                    <span>{{ $t('username') }}</span>
                    <input v-model="username" :disabled="loading" type="text" >
                </label>
                <label>
                    <span>{{ $t('password') }}</span>
                    <input v-model="password" :disabled="loading" type="password" >
                </label>

                <button
                    :disabled="loading || !username || !password"
                    type="submit"
                    class="u-button u-button-primary u-submit"
                >
                    <span v-if="!loading" v-html="buttonText"/>
                    <i v-else class="fa fa-spinner fa-spin" aria-hidden="true"/>
                </button>
            </form>
        </template>
    </startup-layout>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import state from '@/libs/state';
import Logger from '@/libs/Logger';
import StartupLayout from './CommonLayout';

let log = Logger.namespace('Startup/kiwiBnc');

export default {
    components: {
        StartupLayout,
    },
    data: function data() {
        return {
            loading: false,
            username: '',
            password: '',
            statusMessage: '',
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
            if (this.loading) {
                return '';
            }

            let greeting = state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                this.$t('start_button');
        },
    },
    methods: {
        startUp: async function startUp() {
            this.statusMessage = this.$t('logging_in');
            this.loading = true;

            let bncnet = this.getBncNetwork();

            let cleanUpEvents = () => {
                bncnet.ircClient.off('registered', onRegistered);
                bncnet.ircClient.off('irc error', onError);
                bncnet.ircClient.off('close', onClose);
            };

            let onRegistered = async() => {
                cleanUpEvents();

                let bncNetworks = await bncnet.ircClient.bnc.getNetworks();
                for (let i = 0; i < bncNetworks.length; i++) {
                    let network = bncNetworks[i];
                    network.buffers = [];
                    try {
                        /* eslint-disable no-await-in-loop */
                        let buffers = await bncnet.ircClient.bnc.getBuffers(network.name);
                        network.buffers = buffers;
                    } catch (err) {
                        // Log the error here or something
                        log.error(err);
                    }

                    this.addNetworkToState(network);
                }

                this.monitorNetworkChanges(bncnet, bncNetworks);
                this.$refs.layout.close();
            };

            let onError = (event) => {
                cleanUpEvents();
                this.statusMessage = this.$t('invalid_login');
                this.loading = false;
            };

            let onClose = (event) => {
                cleanUpEvents();
                this.statusMessage = this.$t('invalid_login');
                this.loading = false;
            };

            bncnet.ircClient.once('registered', onRegistered);
            bncnet.ircClient.once('irc error', onError);
            bncnet.ircClient.once('close', onClose);
            bncnet.ircClient.connect();
        },

        getBncNetwork: function getBncNetwork() {
            let bnc = state.setting('bnc');

            if (bnc.network) {
                bnc.username = this.username;
                bnc.password = this.password;
                return bnc.network;
            }

            let options = state.settings.startupOptions;

            // Indicate that all our connections will be going through a BNC
            bnc.active = true;
            bnc.server = options.server || '';
            bnc.port = options.port || 6667;
            bnc.tls = !!options.tls;
            bnc.username = this.username;
            bnc.password = this.password;

            let bncnet = state.addNetwork('bnccontrol', this.username, {
                server: bnc.server,
                port: bnc.port,
                tls: bnc.tls,
            });

            bnc.network = bncnet;

            return bncnet;
        },

        addNetworkToState: function addNetworkToState(network) {
            // Expects network to be in the format of:
            //  {
            //  "buffers":[{"channel":"1","name":"#prawnsalad","joined":"1"}],
            //  "name":"freenode",
            //  "channel":"1",
            //  "connected":"1",
            //  "host":"irc.freenode.net",
            //  "port":"6667",
            //  "tls":"0",
            //  "nick":"notprawn99829"
            //  },
            let net = state.addNetwork(network.name, network.nick, {
                server: network.host,
                port: network.port,
                tls: network.tls,
                password: network.password,
                bncname: network.name,
                username: network.user,
            });

            network.buffers.forEach((buffer) => {
                let newBuffer = state.addBuffer(net.id, buffer.name);
                if (buffer.joined) {
                    newBuffer.enabled = true;
                }
                if (buffer.seen) {
                    newBuffer.last_read = (new Date(buffer.seen)).getTime();
                }
            });
        },

        monitorNetworkChanges: function monitorNetworkChanges(bncNet, bncNetworks) {
            let existingNets = Object.create(null);
            function rememberNetworks() {
                state.networks.forEach((network) => {
                    if (!network.connection.bncname) {
                        return;
                    }

                    existingNets[network.connection.bncname] = {
                        name: network.connection.bncname,
                        host: network.connection.server,
                        port: network.connection.port,
                        tls: network.connection.tls,
                        password: network.password,
                        nick: network.nick,
                        username: network.username,
                    };
                });
            }

            rememberNetworks();

            let saveState = (newVal) => {
                state.networks.forEach((network) => {
                    // Only deal with BNC networks
                    if (network.name === 'bnccontrol') {
                        return;
                    }

                    let bncName = network.connection.bncname;
                    let current = existingNets[bncName] || {};
                    let tags = {};

                    if (network.connection.server !== current.host) {
                        tags.host = network.connection.server;
                    }
                    if (network.connection.port !== current.port) {
                        tags.port = network.connection.port;
                    }
                    if (network.connection.tls !== current.tls) {
                        tags.tls = network.connection.tls;
                    }
                    if (network.password !== current.password) {
                        tags.password = network.password;
                    }
                    if (network.nick !== current.nick) {
                        tags.nick = network.nick;
                    }
                    if (network.username !== current.username) {
                        tags.user = network.username;
                    }

                    // A newly added network would not have a current name property set yet.
                    // Only save the network if we've entered a host.
                    if (!current.name && tags.host) {
                        network.connection.bncname = network.name;
                        bncNet.ircClient.bnc.addNetwork(
                            network.name,
                            tags.host,
                            tags.port,
                            tags.tls,
                            tags.nick,
                            tags.user,
                            tags.password,
                        );
                    } else if (current.name) {
                        bncNet.ircClient.bnc.saveNetwork(bncName, tags);
                    }
                });

                rememberNetworks();
            };

            let debouncedSaveState = _.debounce(saveState, 2000);

            state.$watch('networks', debouncedSaveState, { deep: true });

            // Just before we connect to a network, make sure the BNC is sabed and connected to
            // it or at least trying to connect.
            state.$on('network.connecting', (event) => {
                saveState();

                let netName = event.network.connection.bncname;
                let networkFromBnc = _.find(bncNetworks, { name: netName });
                if (networkFromBnc && !networkFromBnc.connected) {
                    bncNet.ircClient.raw('BOUNCER connect ' + netName);
                }
            });

            // Very hacky until we have network name renaming on the bnc. When a new network
            // is added, change the name to the next available network name.
            state.$on('network.new', (event) => {
                let currentNum = 1;
                let existingNet = true;
                while (existingNet) {
                    existingNet = _.find(state.networks, { name: 'Network' + currentNum });
                    if (!existingNet) {
                        event.network.name = 'Network' + currentNum;
                    }

                    currentNum++;
                }
            });

            state.$on('network.removed', (event) => {
                bncNet.ircClient.bnc.removeNetwork(event.network.connection.bncname);
            });

            state.$on('buffer.close', (event) => {
                let buffer = event.buffer;
                let network = event.buffer.getNetwork();
                let bncName = network.connection.bncname;

                if (bncName) {
                    bncNet.ircClient.bnc.closeBuffer(bncName, buffer.name);
                }
            });
        },
    },
};
</script>

<style>

.kiwi-startbnc-form label {
    text-align: left;
    display: block;
    margin-bottom: 1.5em;
}

.kiwi-startbnc-form input,
.kiwi-startbnc-form input:active {
    font-size: 1em;
    width: 100%;
    box-sizing: border-box;
    line-height: 30px;
    padding: 0 10px;
    border: none;
    border-bottom: 2px solid #42b992;
    outline: none;
}

.kiwi-startbnc-status {
    margin: 1em 0;
    overflow: hidden;
    max-height: 40px;
    transition: max-height 0.2s;
}

.kiwi-startbnc-status:empty {
    background: red;
    max-height: 0;
}

.kiwi-startbnc-start {
    font-size: 1.1em;
    cursor: pointer;
}

.kiwi-startbnc-form {
    width: 300px;
    background-color: #fff;
    border-radius: 0.5em;
    padding: 1em;
    border: 1px solid #ececec;
}

.kiwi-startbnc-form button {
    width: 100%;
    line-height: 36px;
    padding: 0;
    font-size: 1.2em;
    font-weight: normal;
}

</style>
