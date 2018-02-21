<template>
    <div class="kiwi-notconnected" v-bind:class="{ connecting: shouldShowLoading }">
        <div class="kiwi-notconnected-bigicon">
            <i v-if="!shouldShowLoading" class="fa fa-frown-o" aria-hidden="true"></i>
            <i v-else class="fa fa-refresh fa-spin kiwi-notconnected-bigicon" aria-hidden="true"></i>
        </div>

        <div v-if="!shouldShowLoading" class="kiwi-notconnected-caption">

            <span class="disconnect-information">You are not currently connected!</span>

            <div class="button-container">
            <template v-if="isChannel()">
                <span @click="reconnect" class="button">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    {{$t('reconnect_channel', {channel: buffer.name})}}
                </span>
            </template>
            <template v-else-if="isServer()">
                <span @click="reconnect" class="button">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    {{$t('reconnect_network', {network: buffer.getNetwork().name})}}
                </span>
            </template>
            <template v-else-if="isQuery()">
                <span @click="reconnect" class="button">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    {{$t('reconnect_query', {user: buffer.name})}}</i>
                </span>
            </template>

            <a @click="showNetworkSettings" class="kiwi-notconnected-networksettings button connection-settings">
                <i class="fa fa-cogs" aria-hidden="true"></i>{{$t('reconnect_settings')}}
            </a>

            </div>
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
