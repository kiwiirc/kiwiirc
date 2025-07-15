<template>
    <div class="kiwi-personal">
        <h1>{{ $t('personal_client') }}</h1>

        <p>{{ $t('personal_addjoin') }}</p>
        <p>{{ $t('personal_return') }}</p>

        <button
            type="button"
            class="u-button u-button-primary"
            @click="addNetwork"
        >
            {{ $t('personal_add') }}
        </button> <br>

        <a
            v-if="networks.length>0"
            class="u-link kiwi-personal-existing-networks"
            @click.stop="toggleStateBrowser"
        >
            {{ $t('personal_saved') }}
        </a>

        <div
            :class="{'kiwi-aboutnew-content--open': about_open}"
            class="kiwi-aboutnew-content"
            v-html="aboutContent"
        />
        <div class="kiwi-aboutnew">
            <div class="kiwi-aboutnew-sep" />
            <a
                class="u-link"
                @click="about_open=!about_open"
            >
                Link to your network / channel
            </a>

            <div class="kiwi-aboutnew-help">
                <a @click="about_open=!about_open">
                    <i class="fa fa-question-circle" aria-hidden="true" />
                </a>
            </div>
        </div>
    </div>
</template>

<script>
'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import getState from '@/libs/state';
import aboutContent from './about.html';

let firstRun = true;

const ctor = {
    data: function data() {
        return {
            about_open: false,
        };
    },
    computed: {
        networks() {
            return this.$state.networks;
        },
        aboutContent() {
            return aboutContent;
        },
    },
    methods: {
        addNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = this.$state.addNetwork(TextFormatting.t('new_network'), nick, {});
            network.showServerBuffer('settings');
        },
        toggleStateBrowser() {
            this.$state.$emit('statebrowser.show');
        },
        async init() {
            this.$state.persistence.watchStateForChanges();
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

export default ctor;
getState().getStartups().kiwiirccom = ctor;
</script>

<style>

.kiwi-aboutnew {
    position: absolute;
    bottom: 0;
    height: 53px;
    left: 0;
    right: 0;
    padding: 0 10px 10px 10px;
    box-sizing: border-box;
}

.kiwi-aboutnew-sep {
    margin-bottom: 10px;
    border-top: 1px solid #ddd;
}

.kiwi-aboutnew-help {
    font-size: 1.9em;
    float: right;
    cursor: pointer;
}

.kiwi-aboutnew-content {
    display: none;
    position: absolute;
    top: 4px;
    left: 0;
    bottom: 53px;
    width: 100%;
    background: #fff;
    text-align: left;
    line-height: 1.6em;
    padding: 2em;
    box-sizing: border-box;
    overflow: auto;
}

.kiwi-aboutnew-content--open {
    display: block;
}

@media screen and (min-width: 700px) {
    .kiwi-aboutnew-content {
        padding: 2em 3em;
    }
}

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
