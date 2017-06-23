<template>
    <div class="kiwi-personal">
        <h1>Your IRC client.</h1>

        <p>Add your networks. Join your channels.</p>
        <p>They will be here when you come back.</p>

        <button @click="addNetwork" class="u-button u-button-primary">Add A Network</button> <br />
        <a v-if="networks.length>0" @click.stop="toggleStateBrowser" class="u-link kiwi-personal-existing-networks">Saved networks</a>
    </div>
</template>

<script>

import NetworkSettings from 'src/components/NetworkSettings';
import * as Storage from 'src/libs/storage/Local';
import state from 'src/libs/state';
import StatePersistence from 'src/libs/StatePersistence';
import logger from 'src/libs/Logger';

let firstRun = true;

export default {
    data: function data() {
        return {
        };
    },
    computed: {
        networks() {
            return state.networks;
        },
    },
    methods: {
        addNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork('New Network', nick, {});
            state.$emit('active.component', NetworkSettings, {
                network,
            });
        },
        toggleStateBrowser() {
            state.$emit('statebrowser.show');
        },
        async init() {
            let stateKey = state.settings.startupOptions.state_key;
            if (stateKey) {
                let persist = new StatePersistence(stateKey, state, Storage, logger);
                await persist.loadStateIfExists();
                persist.watchStateForChanges();
            }

            this.$emit('start', {
                fallbackComponent: this.constructor,
            });
        },
    },
    created: async function created() {
        if (firstRun) {
            this.init();
            firstRun = false;
        }
    },
};
</script>

<style>

.kiwi-personal {
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
    text-align: center;
    padding-top: 1em;
    font-size: 1.2em;
}
.kiwi-personal h1 {
    margin: 2em 0;
}
.kiwi-personal button {
    margin-top: 2.7em;
    margin-bottom: 1.5em;
}
/* Only show the toggle state browser link if on a small screen */
.kiwi-personal-existing-networks {
    display: none;
}
@media screen and (max-width: 500px) {
    .kiwi-personal-existing-networks {
        display: inherit;
    }
}

</style>
