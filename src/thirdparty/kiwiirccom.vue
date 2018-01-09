<template>
    <div class="kiwi-personal">
        <h1>{{$t('personal_client')}}</h1>

        <p>{{$t('personal_addjoin')}}</p>
        <p>{{$t('personal_return')}}</p>

        <button @click="addNetwork" class="u-button u-button-primary">{{$t('personal_add')}}</button> <br />
        <a v-if="networks.length>0" @click.stop="toggleStateBrowser" class="u-link kiwi-personal-existing-networks">{{$t('personal_saved')}}</a>

        <div
            class="kiwi-aboutnew-content"
            :class="{'kiwi-aboutnew-content--open': about_open}"
            v-html="aboutContent"
        ></div>
        <div class="kiwi-aboutnew">
            <div class="kiwi-aboutnew-sep"></div>
            <a class="u-link" @click="about_open=!about_open">Link to your network / channel</a>

            <div class="kiwi-aboutnew-help">
                <a @click="about_open=!about_open"><i class="fa fa-question-circle" aria-hidden="true"></i></a>
            </div>
        </div>

        <div class="kiwi-sponsor">
            Sponsored by <a href="//www.privateinternetaccess.com/">PrivateInternetAccess</a>
            <span>Protect your internet with a VPN</span>
        </div>
    </div>
</template>

<script>

import state from '@/libs/state';
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
            return state.networks;
        },
        aboutContent() {
            return aboutContent;
        },
    },
    methods: {
        addNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork('New Network', nick, {});
            state.$emit('network.settings', network);
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

export default ctor;
state.getStartups().kiwiirccom = ctor;
</script>

<style>

.kiwi-aboutnew {
    position: absolute;
    bottom: 0px;
    height: 53px;
    left: 0px;
    right: 0px;
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

.kiwi-sponsor {
    position: fixed;
    z-index: 20;
    bottom: 0;
    left: 0;
    width: 185px;
    padding: 10px 0;
    font-size: 0.8em;
    color: #e0e0e0;
}
@media screen and (max-width: 600px) {
    .kiwi-sponsor {
        display: none;
    }
}
.kiwi-sponsor a {
    color: #e0e0e0;
}
.kiwi-sponsor span {
    display: none;
    font-style: italic;
}
.kiwi-sponsor:hover span {
    display: block;
}
.kiwi-sponsor a:hover {
    color: #bbe073;
    text-decoration: none;
}


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
