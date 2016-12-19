<template>
    <div class="kiwi-welcome">
        <h2>Where are you connecting today?</h2>
        <form v-on:submit.prevent="startUp" class="kiwi-welcome-form">
            <template v-if="server_type === 'default'">
                <label>
                    Server
                    <input type="text" v-model="server" />
                </label>
                <label>
                    SSL / TLS
                    <input type="checkbox" v-model="tls" />
                </label>
                <label>
                    Nick
                    <input type="text" v-model="nick" />
                </label>
                <label>
                    Password
                    <input type="password" v-model="password" />
                </label>
            </template>

            <template v-if="server_type === 'znc'">
                <label>
                    Server
                    <input type="text" v-model="server" />
                </label>
                <label>
                    SSL / TLS
                    <input type="checkbox" v-model="tls" />
                </label>
                <label>
                    Username
                    <input type="text" v-model="nick" />
                </label>
                <label>
                    Network
                    <input type="text" v-model="znc_network" />
                </label>
                <label>
                    Password
                    <input type="password" v-model="password" />
                </label>
            </template>

            <button type="submit" class="kiwi-welcome-submit u-button u-button-primary">Connect</button>
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
            console.log('Importing state', storedState);
            state.importState(storedState);
            if (state.networks.length > 0) {
                let network = state.networks[0];
                state.setActiveBuffer(network.id, network.serverBuffer().name);
                this.$emit('start');
            }
        }

        // Throttle saving the state into storage so we don't thrash the disk
        let debouncedSaveState = _.debounce(() => {
            console.log('Networks updated, setting localStorage');
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
.kiwi-welcome-form label {
    display: block;
    margin-bottom: 5px;
    text-align: left;
}
.kiwi-welcome-submit {
    margin: 2em 0;
}
.kiwi-welcome-server-types {
    font-size: 0.9em;
}
.kiwi-welcome-server-types a {
    margin: 0 1em;
}
</style>
