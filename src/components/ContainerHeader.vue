<template>
    <div
        class="kiwi-header"
        v-bind:class="{
            'kiwi-header--showall': buffer_settings_open,
        }"
        @click="onHeaderClick"
    >

        <template v-if="isChannel()">
            <div class="kiwi-header-name">{{buffer.name}}</div>
            <div class="kiwi-header-options" v-if="isJoined && isConnected">
                <div class="kiwi-header-option kiwi-header-option-topic" @click="showTopic" v-bind:class="{ 'kiwi-header-option--active': viewTopic == true }" v-if="buffer.topic.length > 0">
                    <a v-if="viewTopic"><i class="fa fa-info" aria-hidden="true"></i> <span class="kiwi-containerheader-hidetext">Hide Topic</span></a>
                    <a v-if="!viewTopic"><i class="fa fa-info" aria-hidden="true"></i> <span class="kiwi-containerheader-hidetext">Display Topic</span></a>
                </div>
                <div class="kiwi-header-option kiwi-header-option-nicklist"><a @click="uiState.showNicklist()"><i class="fa fa-users" aria-hidden="true"></i></i> <span>{{$t('person', {count: Object.keys(buffer.users).length})}}</span></a></div>
                <div class="kiwi-header-option kiwi-header-option-settings"><a @click="uiState.showBufferSettings()"><i class="fa fa-cog" aria-hidden="true"></i> <span>Channel Settings</span></a></div>
                <div v-if="uiState.isPinned" class="kiwi-header-option kiwi-header-option-unpinsidebar"><a @click="uiState.unpin()"><i class="fa fa-thumb-tack" aria-hidden="true"></i></a></div>
                <div class="kiwi-header-option kiwi-header-option-leave"><a @click="closeCurrentBuffer"><i class="fa fa-times" aria-hidden="true"></i></a></div>
            </div>
            <div v-if="!isJoined && isConnected" class="kiwi-header-notjoined">
                <a @click="joinCurrentBuffer" class="u-link kiwi-header-join-channel-button">{{$t('container_join')}}</a>
            </div>
            <div class="kiwi-header-tools">
                <div v-for="el in pluginUiChannelElements" v-rawElement="el" class="kiwi-header-tool"></div>
            </div>

            <div v-if="isJoined && buffer.topic.length > 0 && viewTopic" class="kiwi-header-topic">
                <div>
                    {{buffer.topic}}
                </div>
            </div>

        </template>

        <template v-else-if="isServer()">
            <div v-if="buffer.getNetwork().state === 'disconnected'" class="kiwi-header-server-connection">
                <a @click="onConnectButtonClick" class="u-button u-button-primary">{{$t('connect')}}</a>
            </div>
            <div v-else-if="buffer.getNetwork().state === 'connecting'" class="kiwi-header-server-connection">
                {{$t('connecting')}}
            </div>
            <div class="kiwi-header-name">{{buffer.getNetwork().name}}</div>
        </template>

        <template v-else-if="isQuery()">
            <div class="kiwi-header-name">{{buffer.name}}</div>
            <div class="kiwi-header-tools">
                <div v-for="el in pluginUiQueryElements" v-rawElement="el" class="kiwi-header-tool"></div>
            </div>
            <div class="kiwi-header-options">
                <div class="kiwi-header-option kiwi-header-option-leave"><a @click="closeCurrentBuffer"><i class="fa fa-times" aria-hidden="true"></i></a></div>
                <div v-if="uiState.isPinned" class="kiwi-header-option kiwi-header-option-unpinsidebar"><a @click="uiState.unpin()"><i class="fa fa-thumb-tack" aria-hidden="true"></i></a></div>
            </div>
        </template>

        <template v-else-if="isSpecial()">
            <div class="kiwi-header-options">
                <a class="u-button u-button-secondary" @click="closeCurrentBuffer">{{$t('close')}}</a>
            </div>
            <div class="kiwi-header-name">{{buffer.name}}</div>
        </template>

        <div
            v-if="buffer_settings_open"
            class="kiwi-header-buffersettings"
            @click.stop=""
        >

            <tabbed-view>
                <tabbed-tab :header="$t('settings')" :focus="true">
                    <channel-info v-bind:buffer="buffer"></channel-info>
                </tabbed-tab>
                <tabbed-tab :header="$t('banned')">
                    <channel-banlist v-bind:buffer="buffer"></channel-banlist>
                </tabbed-tab>
                <tabbed-tab :header="$t('notifications')">
                    <buffer-settings v-bind:buffer="buffer"></buffer-settings>
                </tabbed-tab>
            </tabbed-view>

            <a @click="buffer_settings_open=false" class="u-button u-button-secondary kiwi-header-close-buffersettings">
                <i class="fa fa-caret-up" aria-hidden="true"></i>
            </a>
        </div>
    </div>
</template>

<script>

import state from '@/libs/state';
import GlobalApi from '@/libs/GlobalApi';
import BufferSettings from './BufferSettings';
import ChannelInfo from './ChannelInfo';
import ChannelBanlist from './ChannelBanlist';

export default {
    data: function data() {
        return {
            buffer_settings_open: false,
            pluginUiChannelElements: GlobalApi.singleton().channelHeaderPlugins,
            pluginUiQueryElements: GlobalApi.singleton().queryHeaderPlugins,
            viewTopic: false,
        };
    },
    props: ['buffer', 'uiState'],
    computed: {
        isJoined: function isJoined() {
            let buffer = this.buffer;
            return buffer.getNetwork().state === 'connected' && buffer.joined;
        },
        isConnected: function isConnected() {
            return this.buffer.getNetwork().state === 'connected';
        },
    },
    components: {
        BufferSettings,
        ChannelInfo,
        ChannelBanlist,
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
        isSpecial: function isSpecial() {
            return this.buffer.isSpecial();
        },
        showNetworkSettings: function showNetworkSettings(network) {
            network.showServerBuffer('settings');
        },
        onConnectButtonClick() {
            let network = this.buffer.getNetwork();
            if (!network.connection.server) {
                network.showServerBuffer('settings');
            } else {
                network.ircClient.connect();
            }
        },
        showSidebar() {
            state.$emit('sidebar.toggle');
        },
        showTopic() {
            this.viewTopic = !this.viewTopic;
        },
        joinCurrentBuffer: function joinCurrentBuffer() {
            let network = this.buffer.getNetwork();
            this.buffer.enabled = true;
            network.ircClient.join(this.buffer.name);
        },
        closeCurrentBuffer: function closeCurrentBuffer() {
            state.removeBuffer(this.buffer);
        },
        onHeaderClick: function onHeaderClick(event) {
            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName) {
                let network = this.buffer.getNetwork();
                state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
            }
        },
    },
    watch: {
        buffer: function watchBuffer() {
            // When ever the buffer changes, close the settings dropdown
            this.buffer_settings_open = false;
        },
    },
};
</script>

<style lang="less">
.kiwi-header {
    padding: 0;
    z-index: 1;
    transition: all 0.3s;
    line-height: 10px;
    box-sizing: border-box;
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
}

.kiwi-header--showall {
    height: auto;
    max-height: 100%;
    overflow-y: auto;
}

/* why this hover? */
.kiwi-header:hover {
    max-height: none;

    .kiwi-header-topic {
        display: block;
    }
}

.kiwi-header-topic {
    padding: 0;
    line-height: normal;
    max-width: none;
    width: 100%;
    float: right;
    box-sizing: border-box;
    height: auto;
    text-align: left;
}

.kiwi-header-topic > div {
    height: auto;
    font-size: 0.8;
    cursor: default;
    padding: 10px 20px;
}

.kiwi-header-name {
    font-weight: bold;
    cursor: default;
    margin: 0;
    margin-right: 0.5em;
    padding: 0.5em 20px;
    opacity: 1;
    font-size: 20px;
    line-height: normal;
    float: left;
}

.kiwi-header-options {
    width: auto;
    display: inline-block;
    float: right;
}

.kiwi-header-option {
    border: none;
    float: left;
    background: none;
    display: inline-block;
    font-size: 0.8em;
    opacity: 0.9;
    font-weight: 900;
    text-transform: capitalize;

    a {
        float: left;
        padding: 0 10px;
        line-height: 45px;
        display: block;
        font-weight: 600;
        opacity: 0.8;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
            opacity: 1;
        }
    }

    i {
        margin-right: 10px;
        font-size: 1.2em;
        float: left;
        line-height: 45px;
    }

    &--active {
        opacity: 1;

        a {
            opacity: 1;
        }
    }
}

.kiwi-header-option-leave {
    opacity: 1;
    margin: 0;
    transition: all 0.3s;

    i {
        margin: 0;
    }
}

.kiwi-header-option-unpinsidebar i {
    margin: 0;
}

/* The not joined button */
.kiwi-header-notjoined {
    border-radius: 0;
    display: inline-block;
    margin: 0 auto;
    float: right;

    .u-link {
        font-weight: 600;
        line-height: 45px;
        padding: 0 25px;
        border-radius: 0;
        transition: all 0.3;
    }
}

.kiwi-header-server-settings {
    display: inline;
}

.kiwi-header-server-connection {
    float: right;
    padding-right: 10px;
    line-height: 46px;

    .u-button {
        float: right;
        line-height: 35px;
        padding: 0 1em;
        margin: 4px 0;
        border-radius: 4px;
    }
}

.kiwi-header-options .u-button {
    text-transform: uppercase;
    font-size: 0.7em;
    font-weight: 600;
    letter-spacing: 0.2em;
    padding: 0.5em 1.7em;
    line-height: 2em;
    border-radius: 0.4em;
}

.kiwi-header-join-channel-button {
    border-radius: 0.3em;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    line-height: inherit;
    height: auto;
    display: inline-block;
    padding: 0.2em 1em;
    font-size: 0.8em;
}

.kiwi-header-close-buffersettings {
    float: right;
}

.kiwi-header-buffersettings {
    padding: 5px;
    margin-top: 1em;
}

@media screen and (max-width: 769px) {
    .kiwi-container-toggledraw-statebrowser {
        z-index: 10;
        border-bottom: none;
    }

    .kiwi-header {
        margin-right: 0;
        overflow: visible;
        height: auto;
        max-height: none;
        padding-left: 0;
        margin-left: 0;

        .kiwi-header-name {
            line-height: normal;
            padding-left: 60px;
        }
    }

    .kiwi-header-option {
        a {
            i {
                margin-right: 0;
            }
        }

        .fa-info {
            display: block;
            font-size: 1.5em;
            padding: 0;
            opacity: 0.8;
            line-height: 45px;
        }

        span {
            display: none;
        }
    }

    .kiwi-header-server-connection .u-button {
        line-height: 32px;
        margin: 7px 0 0 0;
        opacity: 1;
        font-weight: 600;
    }

    .kiwi-header-notjoined {
        height: 45px;
        margin: 0;
    }

    .kiwi-header-notjoined .kiwi-header-join-channel-button {
        padding-left: 10px;
        padding-right: 10px;
    }

    .kiwi-containerheader-hidetext {
        display: none;
    }
}

</style>
