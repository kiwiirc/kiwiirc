<template>
    <div class="kiwi-personal">
        <h1>{{$t('personal_client')}}</h1>

        <p>{{$t('personal_addjoin')}}</p>
        <p>{{$t('personal_return')}}</p>

        <button @click="addNetwork" class="u-button u-button-primary">{{$t('personal_add')}}</button> <br />
        <a v-if="networks.length>0" @click.stop="toggleStateBrowser" class="u-link kiwi-personal-existing-networks">{{$t('personal_saved')}}</a>
    </div>
</template>

<script>

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
    methods: {
        addNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork('New Network', nick, {});
            network.showServerBuffer('settings');
        },
        toggleStateBrowser() {
            state.$emit('statebrowser.show');
        },
        async init() {
            state.persistence.watchStateForChanges();
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
