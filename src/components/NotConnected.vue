<template>
    <div class="kiwi-notconnected">
        <div class="kiwi-notconnected-bigicon">
            <i v-if="!shouldShowLoading" @click="reconnect" class="fa fa-plug" aria-hidden="true"></i>
            <i v-else class="fa fa-refresh fa-spin kiwi-notconnected-bigicon" aria-hidden="true"></i>
        </div>

        <div v-if="!shouldShowLoading" class="kiwi-notconnected-caption">
            <template v-if="isChannel()">
                <span @click="reconnect">{{$t('reconnect_channel', {channel: buffer.name})}}</span>
            </template>
            <template v-else-if="isServer()">
                <span @click="reconnect">{{$t('reconnect_network', {network: buffer.getNetwork().name})}}</span>
            </template>
            <template v-else-if="isQuery()">
                <span @click="reconnect">{{$t('reconnect_query', {user: buffer.name})}}</i></span>
            </template>

            <a @click="showNetworkSettings" class="kiwi-notconnected-networksettings u-link">{{$t('reconnect_settings')}}</a>
        </div>
        <div v-else class="kiwi-notconnected-caption">
            {{$t('connecting')}}
        </div>
    </div>
</template>

<script>

import state from '@/libs/state';

export default {
    data: function data() {
        return {
            forceLoader: false,
        };
    },
    props: ['buffer', 'network'],
    computed: {
        netStatus: function netStatus() {
            return this.buffer.getNetwork().state;
        },
        shouldShowLoading: function showShowLoading() {
            // The connection can fail almost imediately making it look like
            // the connection attempt didn't try anything. Make the connection
            // loder stay visible for at elast X seconds to indicate it's actually
            // tried something.
            let minimumLoaderViewtime = 2000;
            let networkState = this.network.state;

            if (networkState !== 'disconnected' || this.forceLoader) {
                this.forceLoader = true;
                setTimeout(() => {
                    this.forceLoader = false;
                }, minimumLoaderViewtime);

                return true;
            }

            return false;
        },
    },
    methods: {
        isChannel: function isChannel() {
            return this.buffer.isChannel();
        },
        isServer: function isServer() {
            return this.buffer.isServer();
        },
        isQuery: function isQuery() {
            return this.buffer.isQuery();
        },
        reconnect: function reconnect() {
            if (this.buffer.isChannel()) {
                this.buffer.enabled = true;
            }
            this.buffer.getNetwork().ircClient.connect();
        },
        showNetworkSettings: function showNetworkSettings() {
            let network = this.buffer.getNetwork();
            state.$emit('network.settings', network);
        },
    },
};

</script>

<style>
.kiwi-notconnected {
    box-sizing: border-box;
    margin: 3em 0;
    text-align: center;
}
.kiwi-notconnected-bigicon {
    display: inline-block;
}
.kiwi-notconnected-bigicon > i {
    font-size: 4em;
    cursor: pointer;
}
.kiwi-notconnected-caption {
    display: inline-block;
    font-size: 1.2em;
    margin-left: 2em;
    cursor: pointer;
}
.kiwi-notconnected-networksettings {
    display: block;
    font-size: 0.9em;
    margin-top: 1em;
}
</style>
