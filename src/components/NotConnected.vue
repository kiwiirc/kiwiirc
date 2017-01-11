<template>
    <div class="kiwi-notconnected">
        <div class="kiwi-notconnected-bigicon">
            <i v-if="!shouldShowLoading" @click="connectNetwork" class="fa fa-plug" aria-hidden="true"></i>
            <i v-else class="fa fa-refresh fa-spin kiwi-notconnected-bigicon" aria-hidden="true"></i>
        </div>

        <div v-if="!shouldShowLoading" class="kiwi-notconnected-caption">
            <template v-if="isChannel()">
                <span @click="joinChannelAndConnectNetwork">Reconnect to join <i>{{buffer.name}}</i></span>
            </template>
            <template v-else-if="isServer()">
                <span @click="connectNetwork">Reconnect to <i>{{buffer.getNetwork().name}}</i> to start talking</span>
            </template>
            <template v-else-if="isQuery()">
                <span @click="connectNetwork">Reconnect to continue talking to <i>{{buffer.name}}</i></span>
            </template>

            <a @click="showNetworkSettings" class="kiwi-notconnected-networksettings u-link">Connection settings</a>
        </div>
        <div v-else class="kiwi-notconnected-caption">
            Connecting..
        </div>
    </div>
</template>

<script>

import state from 'src/libs/state';
import NetworkSettings from './NetworkSettings';

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
        joinChannelAndConnectNetwork: function joinChannelAndConnectNetwork() {
            this.buffer.joined = true;
            this.connectNetwork();
        },
        connectNetwork: function connectNetwork() {
            this.buffer.getNetwork().ircClient.connect();
        },
        showNetworkSettings: function showNetworkSettings() {
            let network = this.buffer.getNetwork();
            state.$emit('active.component', NetworkSettings, {
                network,
            });
        },
    },
};

</script>

<style>
.kiwi-notconnected {
    box-sizing: border-box;
    margin: 3em 0;
}
.kiwi-notconnected-bigicon {
    text-align: center;
}
.kiwi-notconnected-bigicon > i {
    font-size: 4em;
    cursor: pointer;
}
.kiwi-notconnected-caption {
    text-align: center;
    font-size: 1.2em;
    margin-top: 1em;
    cursor: pointer;
}
.kiwi-notconnected-networksettings {
    display: block;
    font-size: 0.9em;
    margin-top: 1em;
}
</style>
