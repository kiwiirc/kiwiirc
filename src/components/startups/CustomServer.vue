<template>
    <div class="kiwi-welcome">
        <h2>Where are you connecting today?</h2>
        <form v-on:submit.prevent="startUp" class="u-form kiwi-welcome-form">
            <template v-if="server_type === 'default'">
                <label>
                    <span>Server</span>
                    <input type="text" v-model="server" />
                </label>
                <label>
                    <span>SSL / TLS</span>
                    <input type="checkbox" v-model="tls" />
                </label>
                <label>
                    <span>Nick</span>
                    <input type="text" v-model="nick" />
                </label>
                <label>
                    <span>Password</span>
                    <input type="password" v-model="password" />
                </label>
            </template>

            <template v-if="server_type === 'znc'">
                <label>
                    <span>Server</span>
                    <input type="text" v-model="server" />
                </label>
                <label>
                    <span>SSL / TLS</span>
                    <input type="checkbox" v-model="tls" />
                </label>
                <label>
                    <span>Username</span>
                    <input type="text" v-model="nick" />
                </label>
                <label>
                    <span>Network</span>
                    <input type="text" v-model="znc_network" />
                </label>
                <label>
                    <span>Password</span>
                    <input type="password" v-model="password" />
                </label>
            </template>

            <button type="submit" class="u-button u-button-primary u-submit">Connect</button>
        </form>

        <div class="kiwi-welcome-server-types">
            <a @click="server_type = 'default'" class="u-link">Network</a>
            <a @click="server_type = 'znc'" class="u-link">ZNC</a>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import * as Storage from 'src/libs/storage/Local';
import state from 'src/libs/state';
import logger from 'src/libs/Logger';

export default {
    data: function data() {
        return {
            server_type: 'default',
            server: '',
            tls: false,
            nick: '',
            password: '',
            znc_network: '',
        };
    },
    methods: {
        startUp: function startUp() {
            let net;

            if (this.server_type === 'default') {
                net = state.addNetwork('Network', this.nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: this.password,
                });
            } else if (this.server_type === 'znc') {
                net = state.addNetwork('ZNC', this.nick, {
                    server: this.server.split(':')[0],
                    port: parseInt(this.server.split(':')[1] || 6667, 10),
                    tls: this.tls,
                    password: this.nick + '/' + this.znc_network + ':' + this.password,
                });
            }

            if (net) {
                state.setActiveBuffer(net.id, net.serverBuffer().name);
                net.ircClient.connect();
                this.$emit('start');
            }
        },
    },
    created: async function created() {
        // If we have networks from a previous state, launch directly into it
        let storedState = await Storage.get('kiwi-state');
        if (storedState) {
            logger('Importing state', storedState);
            state.importState(storedState);
            if (state.networks.length > 0) {
                let network = state.networks[0];
                state.setActiveBuffer(network.id, network.serverBuffer().name);
                this.$emit('start');
            }
        }

        // Throttle saving the state into storage so we don't thrash the disk
        let debouncedSaveState = _.debounce(() => {
            logger('Networks updated, setting localStorage');
            Storage.set('kiwi-state', state.exportState());
        }, 1000);

        state.$watch('networks', debouncedSaveState, { deep: true });
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
