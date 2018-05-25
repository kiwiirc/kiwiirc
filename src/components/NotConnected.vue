<template>
    <div class="kiwi-notconnected" v-bind:class="{ connecting: shouldShowLoading }">
        <div class="kiwi-notconnected-bigicon">
            <i v-if="!shouldShowLoading" class="fa fa-frown-o" aria-hidden="true"></i>
            <i v-else class="fa fa-refresh fa-spin kiwi-notconnected-bigicon" aria-hidden="true"></i>
        </div>

        <template v-if="!shouldShowLoading">
        <div class="kiwi-notconnected-caption">
            <span>You are not currently connected!</span>
        </div>
        <div class="kiwi-notconnected-buttons">
            <template v-if="isChannel()">
                <span @click="reconnect" class="kiwi-notconnected-button">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    {{$t('reconnect_channel', {channel: buffer.name})}}
                </span>
            </template>
            <template v-else-if="isServer()">
                <span @click="reconnect" class="kiwi-notconnected-button">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    {{$t('reconnect_network', {network: buffer.getNetwork().name})}}
                </span>
            </template>
            <template v-else-if="isQuery()">
                <span @click="reconnect" class="kiwi-notconnected-button">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    {{$t('reconnect_query', {user: buffer.name})}}</i>
                </span>
            </template>

            <a @click="showNetworkSettings" class="kiwi-notconnected-button kiwi-notconnected-button-settings">
                <i class="fa fa-cogs" aria-hidden="true"></i>{{$t('reconnect_settings')}}
            </a>
        </div>
        </template>
        <div v-else class="kiwi-notconnected-caption">
            {{$t('connecting')}}
        </div>
    </div>
</template>

<script>

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
            network.showServerBuffer('settings');
        },
    },
};
</script>

<style lang="less">
.kiwi-notconnected {
    box-sizing: border-box;
    text-align: center;
    padding: 10% 0;
    margin: 10px 0 0 0;
    transition: background-color 0.3s;
}

.kiwi-notconnected-bigicon {
    display: inline-block;
    width: 100%;
    margin: 0 0 1em 0;
}

.kiwi-notconnected-bigicon i {
    font-size: 4em;
    cursor: default;
}

.kiwi-notconnected-caption {
    display: block;
    width: 100%;
    font-size: 1.6em;
    cursor: default;
    margin: 0 0 0.5em 0;
}

.kiwi-notconnected-buttons {
    width: 100%;
    text-align: center;
    font-size: 1.6em;
    padding-top: 1em;
}

.kiwi-notconnected-button {
    width: auto;
    display: inline-block;
    padding: 0.8em 1em 0.8em 0.6em;
    font-size: 0.8em;
    border-radius: 0.4em;
    margin: 0 0.8em;
    cursor: pointer;
    transition: all 0.3s;
}

.kiwi-notconnected-button:hover {
    transition: all 0.2s;
}

.kiwi-notconnected-button i {
    float: left;
    font-size: 1.6em;
    line-height: 0.8em;
    margin-right: 0.4em;
}

.kiwi-notconnected-button-settings {
    font-size: 0.6em;
    clear: both;
    display: block;
    max-width: 160px;
    margin: 1em auto;
}

.kiwi-notconnected-button-settings i {
    line-height: 1em;
}

@media screen and (max-width: 1024px) {
    .kiwi-notconnected-caption {
        font-size: 1em;
    }

    .kiwi-notconnected-button {
        clear: both;
        margin: 0 5% 1em;
        font-size: 1em;
        display: block;
        padding: 0.6em 0.8em 0.6em 0.4em;
        width: 90%;
        box-sizing: border-box;
    }

    .kiwi-notconnected-button-settings {
        font-size: 1em;
        max-width: none;
    }

    .kiwi-notconnected-button i {
        display: none;
    }
}

@media screen and (max-width: 769px) {
    .kiwi-notconnected {
        font-size: 0.8em;
    }

    .kiwi-notconnected-button {
        font-size: 0.7em;
    }
}

</style>
