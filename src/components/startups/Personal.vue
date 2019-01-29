<template>
    <div class="kiwi-personal">
        <h1>{{ $t('personal_client') }}</h1>

        <p>{{ $t('personal_addjoin') }}</p>
        <p>{{ $t('personal_return') }}</p>

        <button class="u-button u-button-primary" @click="addNetwork">
            {{ $t('personal_add') }}
        </button> <br >
        <a
            v-if="networks.length>0"
            class="u-link kiwi-personal-existing-networks"
            @click.stop="toggleStateBrowser"
        >
            {{ $t('personal_saved') }}
        </a>
    </div>
</template>

<script>
'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import state from '@/libs/state';

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
    created: async function created() {
        if (firstRun) {
            this.init();
            firstRun = false;
        }
    },
    methods: {
        addNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork(TextFormatting.t('new_network'), nick, {});
            network.showServerBuffer('settings');
        },
        toggleStateBrowser() {
            state.$emit('statebrowser.show');
        },
        async init() {
            // persist the buffers in the state by default
            let persistSetting = state.settings.startupOptions.remember_buffers;
            if (typeof persistSetting === 'undefined') {
                state.persistence.includeBuffers = true;
            } else {
                state.persistence.includeBuffers = !!persistSetting;
            }

            state.persistence.watchStateForChanges();

            // force restricted: false as users need access
            // to network settings to add a network
            state.setSetting('settings.restricted', false);

            this.$emit('start', {
                fallbackComponent: this.constructor,
            });
        },
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
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.kiwi-personal h1 {
    margin: 0 0 20px 0;
}

.kiwi-personal p {
    margin: 0 0 10px 0;
}

.kiwi-personal button {
    margin: 10px auto 0 auto;
    padding: 0 40px;
    font-size: 1em;
    line-height: 40px;
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
