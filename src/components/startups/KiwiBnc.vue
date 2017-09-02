<template>
    <div class="kiwi-startbnc">
        <h2 v-html="greetingText"></h2>
        <div v-if="statusMessage">
            {{statusMessage}}
        </div>
        <form v-on:submit.prevent="startUp" class="u-form kiwi-startbnc-form">
            <label>
                <span>{{$t('username')}}</span>
                <input type="text" v-model="username" />
            </label>
            <label>
                <span>{{$t('password')}}</span>
                <input type="password" v-model="password" />
            </label>

            <button type="submit" class="u-button u-button-primary u-submit" v-html="buttonText"></button>
        </form>
    </div>
</template>

<script>

import _ from 'lodash';
// import ServerSession from 'src/libs/ServerSession';
import state from 'src/libs/state';
import logger from 'src/libs/Logger';

export default {
    data: function data() {
        return {
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
                'Welcome to Kiwi IRC!';
        },
        buttonText: function buttonText() {
            let greeting = state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                'Start';
        },
    },
    methods: {
        startUp: async function startUp() {
            this.statusMessage = 'Logging in...';

            let bncnet = this.getBncNetwork();

            let cleanUpEvents = () => {
                bncnet.ircClient.off('registered', onRegistered);
                bncnet.ircClient.off('irc error', onError);
                bncnet.ircClient.off('close', onClose);
            };

            let onRegistered = async () => {
                cleanUpEvents();

                let bncNetworks = await bncnet.ircClient.bnc.getNetworks();
                for (let network of bncNetworks) {
                    network.buffers = [];
                    try {
                        let buffers = await bncnet.ircClient.bnc.getBuffers(network.name);
                        network.buffers = buffers;
                    } catch (err) {
                        // Log the error here or something
                        logger.error(err);
                    }

                    this.addNetworkToState(network);
                }

                this.monitorNetworkChanges(bncnet, bncNetworks);
                this.$emit('start');
            };

            let onError = (event) => {
                cleanUpEvents();
                this.statusMessage = 'Invalid login';
            };

            let onClose = (event) => {
                cleanUpEvents();
                this.statusMessage = 'Invalid login';
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
                password: `${this.username}:${this.password}`,
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

            network.buffers.forEach(buffer => {
                let newBuffer = state.addBuffer(net.id, buffer.name);
                if (buffer.joined) {
                    newBuffer.enabled = true;
                }
            });
        },

        monitorNetworkChanges: function monitorNetworkChanges(bncNet, bncNetworks) {
            let existingNets = Object.create(null);
            function rememberNetworks() {
                state.networks.forEach(network => {
                    if (!network.connection.bncname) {
                        return;
                    }

                    existingNets[network.connection.bncname] = {
                        name: network.connection.bncname,
                        host: network.connection.server,
                        port: network.connection.port,
                        tls: network.connection.tls,
                        password: network.connection.password,
                        nick: network.nick,
                        username: network.username,
                    };
                });
            }

            rememberNetworks();

            let debouncedSaveState = _.debounce(newVal => {
                state.networks.forEach(network => {
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
                    if (network.connection.password !== current.password) {
                        tags.password = network.connection.password;
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
            }, 2000);

            state.$watch('networks', debouncedSaveState, { deep: true });

            // Just before we connect to a network, make sure the BNC is connected to it or
            // at least trying to connect.
            state.$on('network.connecting', event => {
                let netName = event.network.connection.bncname;
                let networkFromBnc = _.find(bncNetworks, { name: netName });
                if (networkFromBnc && !networkFromBnc.connected) {
                    bncNet.ircClient.raw('BOUNCER connect ' + netName);
                }
            });

            // Very hacky until we have network name renaming on the bnc. When a new network
            // is added, change the name to the next available network name.
            state.$on('network.new', event => {
                let currentNum = 1;
                while (true) {
                    let existingNet = _.find(state.networks, { name: 'Network' + currentNum });
                    if (!existingNet) {
                        event.network.name = 'Network' + currentNum;
                        break;
                    }

                    currentNum++;
                }
            });

            state.$on('buffer.close', event => {
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

.kiwi-startbnc {
    text-align: center;
    margin-top: 1em;
}
.kiwi-startbnc-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-startbnc-form {
    width: 300px;
    margin: 2em auto;
}
.kiwi-startbnc-server-types {
    font-size: 0.9em;
}
.kiwi-startbnc-server-types a {
    margin: 0 1em;
}
</style>
