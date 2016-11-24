<template>
    <div class="kiwi-welcome-simple">
        <h2>Welcome to Kiwi IRC!</h2>
        <a class="kiwi-welcome-simple-start" @click="startUp">Join the conversation!</a>
    </div>
</template>

<script>

import state from 'src/libs/state';

export default {
    methods: {
        startUp: function startUp() {
            let storedState = null;
            try {
                storedState = localStorage.getItem('kiwi-state');
            } catch (err) {
                console.error('Error reading state from localStorage', err.stack);
            }

            if (0 && storedState) {
                console.log('Importing state', storedState);
                state.importState(storedState);
            } else {
                let net = state.addNetwork('freenode', 'prawnsalad', {
                    server: 'irc.rizon.net',
                    port: 6667,
                    tls: false,
                });
                state.addBuffer(net.id, '#kiwiirc-dev');
                state.setActiveBuffer(net.id, '#kiwiirc-dev');
            }

            state.$watch('networks', () => {
                console.log('Setting localStorage');
                localStorage.setItem('kiwi-state', state.exportState());
            });

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
.kiwi-welcome-simple-start {
    font-size: 1.1em;
    cursor: pointer;
}
</style>
