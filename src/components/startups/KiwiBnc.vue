<template>
    <div class="kiwi-welcome">
        <h2>Your BNC</h2>
        <div v-if="statusMessage">
            {{statusMessage}}
        </div>
        <form v-on:submit.prevent="startUp" class="u-form kiwi-welcome-form">
            <label>
                <span>{{$t('username')}}</span>
                <input type="text" v-model="username" />
            </label>
            <label>
                <span>{{$t('password')}}</span>
                <input type="password" v-model="password" />
            </label>

            <button type="submit" class="u-button u-button-primary u-submit">{{$t('connect')}}</button>
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
    methods: {
        startUp: async function startUp() {
            this.statusMessage = 'Logging in...';

            let bncnet = this.getBncNetwork();

            bncnet.ircClient.once('registered', async () => {
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
            });

            bncnet.ircClient.connect();
        },

        getBncNetwork: function getBncNetwork() {
            let bnc = state.setting('bnc');

            if (bnc.network) {
                return bnc.network;
            }

            // Indicate that all our connections will be going through a BNC
            bnc.active = true;
            bnc.server = '127.0.0.1';
            bnc.port = 2000;
            bnc.tls = false;
            bnc.username = this.username;
            bnc.password = this.password;

            let bncnet = state.addNetwork('bnccontrol', this.username, {
                server: '127.0.0.1',
                port: 2000,
                tls: false,
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
                        tags.port = network.connection.port.toString();
                    }
                    if (network.connection.tls !== current.tls) {
                        tags.tls = network.connection.tls ? '1' : '0';
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

                    // A newly added network would not have a name property set yet
                    // Only save the network if we've entered a host
                    if (!current.name && tags.host) {
                        network.connection.bncname = network.name;
                        bncNet.ircClient.bnc.addNetwork(
                            network.name,
                            tags.host,
                            tags.port,
                            tags.tls,
                            tags.nick,
                            tags.user,
                        );
                    } else if (current.name) {
                        let lineParts = [];
                        for (let key in tags) {
                            if (tags.hasOwnProperty(key)) {
                                lineParts.push(`${key}=${tags[key]}`);
                            }
                        }

                        if (lineParts.length === 0) {
                            return;
                        }

                        let line = lineParts.join(';');
                        let updateLine = `BOUNCER changenetwork ${bncName} ${line}`;
                        bncNet.ircClient.raw(updateLine);
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
        },
    },
};
</script>

<style>

.kiwi-welcome {
    text-align: center;
    margin-top: 1em;
}
.kiwi-welcome-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-form {
    width: 300px;
    margin: 0 auto;
}
.kiwi-welcome-server-types {
    font-size: 0.9em;
}
.kiwi-welcome-server-types a {
    margin: 0 1em;
}
</style>
