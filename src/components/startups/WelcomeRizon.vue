<template>
    <div class="kiwi-welcome-simple">
        <h2>{{$t('rizon_title')}}</h2>
        <h3>{{$t('rizon_websockets')}}</h3>
        <h3>{{$t('rizon_thanks')}}</h3>

        <form class="u-form kiwi-welcome-simple-form">
            <label><span>{{$t('nick')}}</span> <input type="text" v-model="nick" /></label>
        </form>
        <a class="u-button u-button-primary kiwi-welcome-simple-start" @click="startUp">{{$t('rizon_dev')}}</a>
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

                state.addBuffer(net.id, '#kiwiirc').joined = true;
                state.setActiveBuffer(net.id, '#kiwiirc');
            } else {
                let net = state.networks[0];
                state.setActiveBuffer(net.id, net.serverBuffer().name);
            }

            // Lets run kiwi
            this.$emit('start');

            // Give the DOM some time to update itself first, and then start connecting
            this.$nextTick(() => {
                setTimeout(() => {
                    state.networks[0].ircClient.connect();
                }, 200);
            });
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
