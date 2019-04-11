<template>
    <div :class="{ connecting: shouldShowLoading }" class="kiwi-notconnected kiwi-warning-block">
        <template v-if="!shouldShowLoading">
            <div class="kiwi-notconnected-caption">
                <span>{{ $t('not_connected') }}</span>
                <i v-if="!shouldShowLoading" class="fa fa-frown-o" aria-hidden="true"/>
                <i v-else class="fa fa-refresh fa-spin kiwi-notconnected-bigicon" aria-hidden="true"/>
            </div>
            <div class="kiwi-notconnected-buttons">
                <template v-if="isChannel()">
                    <span class="kiwi-notconnected-button" @click="reconnect">
                        <i class="fa fa-arrow-circle-o-right" aria-hidden="true"/>
                        {{ $t('reconnect_channel', {channel: buffer.name}) }}
                    </span>
                </template>
                <template v-else-if="isServer()">
                    <span class="kiwi-notconnected-button" @click="reconnect">
                        <i class="fa fa-arrow-circle-o-right" aria-hidden="true"/>
                        {{ $t('reconnect_network', {network: buffer.getNetwork().name}) }}
                    </span>
                </template>
                <template v-else-if="isQuery()">
                    <span class="kiwi-notconnected-button" @click="reconnect">
                        <i class="fa fa-arrow-circle-o-right" aria-hidden="true"/>
                        {{ $t('reconnect_query', {user: buffer.name}) }}
                    </span>
                </template>

                <a
                    v-if="!restrictedServer"
                    class="kiwi-notconnected-button kiwi-notconnected-button-settings"
                    @click="showNetworkSettings"
                >
                    <i class="fa fa-cogs" aria-hidden="true"/>{{ $t('reconnect_settings') }}
                </a>
            </div>
        </template>
        <div v-else class="kiwi-notconnected-caption">
            {{ $t('connecting') }}
        </div>
    </div>
</template>

<script>

'kiwi public';

export default {
    props: ['buffer', 'network'],
    data() {
        return {
            forceLoader: false,
        };
    },
    computed: {
        netStatus() {
            return this.buffer.getNetwork().state;
        },
        shouldShowLoading() {
            this.maybeForceLoader();

            if (this.network.state !== 'disconnected' || this.forceLoader) {
                return true;
            }

            return false;
        },
        restrictedServer() {
            return this.$state.setting('restricted');
        },
    },
    methods: {
        maybeForceLoader() {
            // The connection can fail almost imediately making it look like
            // the connection attempt didn't try anything. Make the connection
            // loder stay visible for at elast X seconds to indicate it's actually
            // tried something.
            let minimumLoaderViewtime = 2000;
            let networkState = this.network.state;

            if (networkState !== 'disconnected' && !this.forceLoader) {
                this.forceLoader = true;
                setTimeout(() => {
                    this.forceLoader = false;
                }, minimumLoaderViewtime);
            }
        },
        isChannel() {
            return this.buffer.isChannel();
        },
        isServer() {
            return this.buffer.isServer();
        },
        isQuery() {
            return this.buffer.isQuery();
        },
        reconnect() {
            if (this.buffer.isChannel()) {
                this.buffer.enabled = true;
            }
            this.buffer.getNetwork().ircClient.connect();
        },
        showNetworkSettings() {
            let network = this.buffer.getNetwork();
            network.showServerBuffer('settings');
        },
    },
};
</script>

<style lang="less">
.kiwi-notconnected {
    position: absolute;
    left: 0;
    top: 46px;
    width: 100%;
    box-sizing: border-box;
    padding: 5px 20px;
    transition: background-color 0.3s;
}

.kiwi-notconnected.connecting {
    text-align: center;
}

.kiwi-notconnected-caption {
    display: inline-block;
    width: auto;
    cursor: default;
    line-height: 50px;
    font-size: 1.2em;
    font-weight: 900;
}

.kiwi-notconnected-caption i {
    font-weight: normal;
}

.kiwi-notconnected-buttons {
    float: right;
    width: auto;
    text-align: center;
}

.kiwi-notconnected-button {
    width: auto;
    display: inline-block;
    padding: 5px 10px;
    border-radius: 7px;
    cursor: pointer;
    border: 2px solid;
    margin: 6px 0 0 10px;
    height: 37px;
    overflow: hidden;
    box-sizing: border-box;
    transition: opacity 0.3s, color 0.3s, background-color 0.3s;
}

.kiwi-notconnected-button:hover {
    transition: all 0.2s;
}

.kiwi-notconnected-button i {
    float: left;
    font-size: 1.6em;
    line-height: 24px;
    margin-right: 5px;
}

.kiwi-notconnected-button-settings {
    opacity: 0.8;
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

    .kiwi-notconnected-caption {
        width: 100%;
        text-align: center;
        font-size: 1.3em;
    }

    .kiwi-notconnected-buttons {
        width: 100%;
    }

    .kiwi-notconnected-button {
        font-size: 1em;
        width: 90%;
        line-height: 21px;
        display: inline-block;
        margin: 0 5%;
    }
}

</style>
