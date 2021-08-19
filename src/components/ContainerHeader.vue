<template>
    <div
        class="kiwi-header kiwi-theme-bg"
        @click="onHeaderClick"
    >

        <template v-if="isChannel()">
            <div class="kiwi-header-name-container">
                <div class="kiwi-header-name">{{ buffer.name }}</div>
            </div>
            <div
                v-if="isJoined && isConnected"
                :key="buffer.id"
                class="kiwi-header-options"
            >
                <div
                    v-for="plugin in pluginUiChannelElements"
                    :key="plugin.id"
                    v-rawElement="{
                        el: plugin.el,
                        props: {
                            kiwi: {
                                buffer: buffer,
                                containerheader: self,
                            }
                        }
                    }"
                    class="kiwi-header-option"
                />
                <div
                    :class="{
                        'kiwi-header-option--active': sidebarSection === 'about'
                    }"
                    class="kiwi-header-option kiwi-header-option-about"
                >
                    <a :title="$t('more_information')" @click="sidebarState.toggleAbout()">
                        <i class="fa fa-info" aria-hidden="true" />
                    </a>
                </div>
                <div
                    :class="{
                        'kiwi-header-option--active': sidebarSection === 'nicklist'
                            || sidebarSection === 'user'
                    }"
                    class="kiwi-header-option kiwi-header-option-nicklist"
                >
                    <a
                        :title="$t('person', {count: Object.keys(buffer.users).length})"
                        @click="sidebarState.toggleNicklist()"
                    >
                        <i class="fa fa-users" aria-hidden="true" />
                        <span>{{ Object.keys(buffer.users).length }}</span>
                    </a>
                </div>
                <div
                    :class="{
                        'kiwi-header-option--active': sidebarSection === 'settings'
                    }"
                    class="kiwi-header-option kiwi-header-option-settings"
                >
                    <a
                        :title="$t('channel_settings')"
                        @click="sidebarState.toggleBufferSettings()"
                    >
                        <i class="fa fa-cog" aria-hidden="true" />
                    </a>
                </div>
                <div
                    v-if="sidebarState.isPinned"
                    class="kiwi-header-option kiwi-header-option-unpinsidebar"
                >
                    <a @click="sidebarState.unpin()">
                        <i class="fa fa-thumb-tack" aria-hidden="true" />
                    </a>
                </div>
            </div>
            <div v-if="!isJoined && isConnected" class="kiwi-header-notjoined">
                <a class="u-link kiwi-header-join-channel-button" @click="joinCurrentBuffer">
                    {{ $t('container_join') }}
                </a>
            </div>
        </template>

        <template v-else-if="isServer()">
            <div class="kiwi-header-name-container">
                <div class="kiwi-header-name">
                    {{ buffer.getNetwork().name }}
                </div>
            </div>
            <div class="kiwi-header-server-connection">
                <a
                    v-if="buffer.getNetwork().state === 'disconnected'"
                    class="u-button u-button-primary"
                    @click="onConnectButtonClick"
                >
                    {{ $t('connect') }}
                </a>
                <span v-else-if="buffer.getNetwork().state === 'connecting'">
                    <i class="fa fa-spin fa-spinner" aria-hidden="true" />
                    {{ $t('connecting') }}
                </span>
            </div>
        </template>

        <template v-else-if="isQuery()">
            <div class="kiwi-header-name-container">
                <div class="kiwi-header-name">
                    <away-status-indicator
                        :network="buffer.getNetwork()"
                        :user="network.userByName(buffer.name)"
                        class="kiwi-header-awaystatus"
                    />
                    {{ buffer.name }}
                </div>
            </div>
            <div :key="buffer.id" class="kiwi-header-options">
                <div
                    v-if="userOnline"
                    :class="{
                        'kiwi-header-option--active': sidebarSection === 'user'
                    }"
                    class="kiwi-header-option kiwi-header-option-user"
                >
                    <a @click="toggleUser()">
                        <i class="fa fa-user" aria-hidden="true" />
                    </a>
                </div>
                <div
                    v-for="plugin in pluginUiQueryElements"
                    :key="plugin.id"
                    v-rawElement="{
                        el: plugin.el,
                        props: {
                            kiwi: {
                                buffer: buffer,
                                containerheader: self,
                            }
                        }
                    }"
                    class="kiwi-header-option"
                />
            </div>
        </template>

        <template v-else-if="isSpecial()">
            <div class="kiwi-header-name-container">
                <div class="kiwi-header-name">{{ buffer.name }}</div>
            </div>
            <div class="kiwi-header-options">
                <!-- placeholder -->
            </div>
        </template>
    </div>
</template>

<script>
'kiwi public';

import GlobalApi from '@/libs/GlobalApi';
import toHtml from '@/libs/renderers/Html';
import parseMessage from '@/libs/MessageParser';
import BufferSettings from './BufferSettings';
import ChannelInfo from './ChannelInfo';
import ChannelBanlist from './ChannelBanlist';
import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        BufferSettings,
        ChannelInfo,
        ChannelBanlist,
        AwayStatusIndicator,
    },
    props: ['buffer', 'sidebarState'],
    data() {
        return {
            self: this,
            pluginUiChannelElements: GlobalApi.singleton().channelHeaderPlugins,
            pluginUiQueryElements: GlobalApi.singleton().queryHeaderPlugins,
        };
    },
    computed: {
        isJoined() {
            let buffer = this.buffer;
            return buffer.getNetwork().state === 'connected' && buffer.joined;
        },
        isConnected() {
            return this.buffer.getNetwork().state === 'connected';
        },
        formattedTopic() {
            let blocks = parseMessage(this.buffer.topic, { extras: false });
            let content = toHtml(blocks);
            return content;
        },
        network() {
            return this.buffer.getNetwork();
        },
        sidebarSection() {
            return this.sidebarState.section();
        },
        userOnline() {
            let user = this.$state.getUser(this.buffer.getNetwork().id, this.buffer.name);
            return !!user;
        },
    },
    methods: {
        isChannel() {
            return this.buffer.isChannel();
        },
        isServer() {
            return this.buffer.isServer();
        },
        isQuery() {
            return this.buffer.isQuery();
        },
        isSpecial() {
            return this.buffer.isSpecial();
        },
        showNetworkSettings(network) {
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
        toggleUser() {
            let user = this.$state.getUser(this.buffer.getNetwork().id, this.buffer.name);
            this.sidebarState.toggleUser(user);
        },
        joinCurrentBuffer() {
            let network = this.buffer.getNetwork();
            this.buffer.enabled = true;
            network.ircClient.join(this.buffer.name);
        },
        onHeaderClick(event) {
            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName) {
                let network = this.buffer.getNetwork();
                this.$state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
            }
        },
    },
};
</script>

<style lang="less">
.kiwi-header {
    padding: 0;
    transition: all 0.3s;
    line-height: 10px;
    height: 44px;
    box-sizing: border-box;
    text-align: center;
    border-bottom: 1px solid;
    display: flex;
}

.kiwi-header-name .kiwi-header-awaystatus {
    display: inline-block;
    margin-bottom: 2px;
}

.kiwi-header--showall {
    height: auto;
    max-height: 100%;
    overflow-y: auto;
}

/* why this hover? */
.kiwi-header:hover {
    max-height: none;
}

.kiwi-header-name-container {
    font-weight: bold;
    cursor: default;
    margin: 0;
    margin-right: 0.5em;
    opacity: 1;
    font-size: 20px;
    line-height: 43px;
    flex-grow: 1;
    text-align: left;
    overflow-x: hidden;
    white-space: nowrap;
}

.kiwi-header-name {
    text-overflow: ellipsis;
    overflow: hidden;
    padding: 0 10px;
}

.kiwi-header-name:hover {
    position: absolute;
    padding-right: 10px;
    z-index: 1;
}

.kiwi-header-options {
    width: auto;
    display: inline-block;
    flex-shrink: 0;
}

.kiwi-header-option {
    border: none;
    float: left;
    background: none;
    font-size: 0.8em;
    opacity: 0.9;
    font-weight: 900;
}

.kiwi-header-option a {
    float: left;
    padding: 0 15px;
    line-height: 43px;
    display: block;
    font-weight: 600;
    opacity: 0.8;
    cursor: pointer;
    transition: all 0.3s;
}

.kiwi-header-option a:hover {
    opacity: 1;
}

.kiwi-header-option i {
    font-size: 1.2em;
    float: left;
    line-height: 43px;
}

.kiwi-header-options i + span {
    margin-left: 10px;
}

.kiwi-header-option--active {
    opacity: 1;
}

.kiwi-header-option--active a {
    opacity: 1;
}

/* The not joined button */
.kiwi-header-notjoined {
    border-radius: 0;
    display: inline-block;
    margin: 0 auto;
    float: right;
}

.kiwi-header-notjoined .u-link {
    font-weight: 600;

    /* .kiwi-header height -1px */
    line-height: 43px;
    padding: 0 25px;
    border-radius: 0;
    transition: all 0.3;
}

.kiwi-header-server-settings {
    display: inline;
}

.kiwi-header-server-connection {
    float: right;
    padding-right: 10px;
    line-height: 46px;
}

.kiwi-header-server-connection .u-button {
    float: right;
    line-height: 35px;
    padding: 0 1em;
    margin: 4px 0;
    border-radius: 4px;
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
        border-bottom: none;
    }

    .kiwi-container .kiwi-header {
        margin-right: 0;
        overflow: visible;
        max-height: none;
        padding-left: 0;
        margin-left: 0;
    }

    .kiwi-header-name-container {
        padding-left: 60px;
    }

    .kiwi-header-name {
        padding: 0;
    }

    .kiwi-header-option span {
        display: none;
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
        white-space: nowrap;
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
