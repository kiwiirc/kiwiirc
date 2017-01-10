<template>
    <div class="kiwi-welcome-simple">
        <h2>Kiwi IRC (next gen) - Rizon preview</h2>
        <h3>Direct websockets. No Kiwi server or webirc involved.</h3>
        <h3>(Thanks to Adam @Rizon for the development websocket server support!)</h3>

        <form class="u-form kiwi-welcome-simple-form">
            <label><span>Nick</span> <input type="text" v-model="nick" /></label>
        </form>
        <a class="u-button u-button-primary kiwi-welcome-simple-start" @click="startUp">Give the developer version of Kiwi IRC a try!</a>
    </div>
</template>

<script>

import * as Storage from 'src/libs/storage/Local';
import state from 'src/libs/state';
import StatePersistence from 'src/libs/StatePersistence';
import logger from 'src/libs/Logger';

export default {
    data: function data() {
        return {
            nick: 'kiwidev?',
        };
    },
    methods: {
        startUp: async function startUp() {
            let persist = new StatePersistence('kiwi-state', state, Storage, logger);
            await persist.loadStateIfExists();
            persist.watchStateForChanges();

            // If we have networks from a previous state, launch directly into it
            if (state.networks.length === 0) {
                // Start a new fresh instance of kiwi. Hard coded to Rizon for the
                // websocket dev preview
                let nick = this.nick.replace(/\?/g, () => Math.floor(Math.random() * 100));
                let net = state.addNetwork('rizon', nick, {
                    server: 'ws.rizon.net',
                    port: 8080,
                    tls: false,
                    direct: true,
                });
                net.ircClient.connect();
                state.addBuffer(net.id, '#kiwiirc').joined = true;
                state.setActiveBuffer(net.id, '#kiwiirc');
            }

            // Lets run kiwi
            this.$emit('start');
        },
    },
};
</script>

<style>

.kiwi-welcome-simple {
    text-align: center;
    margin-top: 1em;
}
.kiwi-welcome-simple-form {
    width: 300px;
    display: block;
    margin: 0 auto;
}
.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}
</style>
