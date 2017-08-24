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

            // Indicate that all our connections will be going through a BNC
            let bnc = state.setting('bnc');
            bnc.active = true;
            bnc.server = '127.0.0.1';
            bnc.port = 2000;
            bnc.tls = false;
            bnc.username = this.username;
            bnc.password = this.password;

            let net = state.addNetwork(this.username, this.username, {
                server: '127.0.0.1',
                port: 2000,
                tls: false,
                password: `${this.username}:${this.password}`,
            });

            net.ircClient.once('registered', async () => {
                let networks = await net.ircClient.bnc.getNetworks();
                for (let network of networks) {
                    network.buffers = [];
                    try {
                        let buffers = await net.ircClient.bnc.getBuffers(network.name);
                        network.buffers = buffers;
                    } catch (err) {
                        // Log the error here or something
                        logger.error(err);
                    }

                    this.addNetworkToState(network);
                }

                this.monitorNetworkChanges(net);
                this.$emit('start');
            });

            net.ircClient.connect();
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
            });

            network.buffers.forEach(buffer => {
                let newBuffer = state.addBuffer(net.id, buffer.name);
                if (buffer.joined) {
                    newBuffer.enabled = true;
                }
            });
        },

        monitorNetworkChanges: function monitorNetworkChanges(net) {
            let existingNets = Object.create(null);
            function rememberNetworks() {
                state.networks.forEach(network => {
                    // Only deal with BNC networks
                    if (!network.connection.bncname) {
                        return;
                    }

                    existingNets[network.connection.bncname] = {
                        host: network.connection.server || '',
                        port: network.connection.port,
                        tls: network.connection.tls,
                        password: network.connection.password || '',
                        nick: network.nick || '',
                    };
                });
            }

            rememberNetworks();

            let debouncedSaveState = _.debounce(newVal => {
                state.networks.forEach(network => {
                    // Only deal with BNC networks
                    if (!network.connection.bncname) {
                        return;
                    }

                    let current = existingNets[network.connection.bncname] || {};
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

                    let line = '';
                    for (let key in tags) {
                        if (tags.hasOwnProperty(key)) {
                            line += `${key}=${tags[key]};`;
                        }
                    }

                    if (!line) {
                        return;
                    }

                    let updateLine = `BOUNCER changenetwork ${network.connection.bncname} ${line}`;
                    net.ircClient.raw(updateLine);
                });

                rememberNetworks();
            }, 2000);

            state.$watch('networks', debouncedSaveState, { deep: true });
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
