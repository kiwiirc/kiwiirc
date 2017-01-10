<template>
    <div class="kiwi-welcome-simple">
        <h2>Welcome to Kiwi IRC!</h2>

        <template v-if="!network">
            <a class="u-button u-button-primary kiwi-welcome-simple-start" @click="startUp">Join the conversation!</a>
        </template>
        <template v-else-if="network.state !== 'connected'">
            Loading...
        </template>
        
    </div>
</template>

<script>

import state from 'src/libs/state';

export default {
    data: function data() {
        return {
            network: null,
        };
    },
    methods: {
        startUp: function startUp() {
            let net = this.network = state.addNetwork('freenode', 'kiwidev', {
                server: 'irc.freenode.net',
                port: 6667,
                tls: false,
                //direct: true,
            });
            state.addBuffer(net.id, '#kiwiirc-dev').joined = true;
            state.setActiveBuffer(net.id, '#kiwiirc-dev');

            net.ircClient.connect();
            net.ircClient.once('registered', () => {
                this.$emit('start');
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
.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}
</style>
