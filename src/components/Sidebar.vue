<template>
    <div
        :class="['kiwi-sidebar-section-' + section]"
        class="kiwi-sidebar kiwi-theme-bg"
    >
        <span v-if="!sidebarState.isOpen" class="kiwi-sidebar-options">
            <div class="kiwi-sidebar-close" @click="sidebarState.close()">
                {{ $t('close') }}<i class="fa fa-times" aria-hidden="true" />
            </div>
        </span>

        <template v-if="sidebarState.activeComponent">
            <component
                :is="sidebarState.activeComponent"
                :network="network"
                :buffer="buffer"
                :sidebar-state="sidebarState"
            />
        </template>
        <template v-else-if="buffer">
            <template v-if="buffer.isChannel()">
                <div
                    v-if="section === 'settings'"
                    class="kiwi-sidebar-buffersettings"
                    @click.stop=""
                >

                    <tabbed-view>
                        <tabbed-tab :header="$t('settings')" :focus="true">
                            <h3>{{ $t('channel_settings') }}</h3>
                            <hr>
                            <channel-info :buffer="buffer" />

                            <div class="kiwi-sidebar-settings">
                                <h3>{{ $t('side_settings') }}</h3>
                                <hr>
                                <form class="u-form">
                                    <label class="u-checkbox-wrapper">
                                        <span>{{ $t('side_joins') }}</span>
                                        <input v-model="settingShowJoinParts" type="checkbox">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{ $t('side_topics') }}</span>
                                        <input v-model="settingShowTopics" type="checkbox">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{ $t('side_nick_changes') }}</span>
                                        <input v-model="settingShowNickChanges" type="checkbox">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{ $t('side_mode_changes') }}</span>
                                        <input v-model="settingShowModeChanges" type="checkbox">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{ $t('side_formatting') }}</span>
                                        <input v-model="settingExtraFormatting" type="checkbox">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{ $t('side_colours') }}</span>
                                        <input v-model="settingColouredNicklist" type="checkbox">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{ $t('settings_share_typing') }}</span>
                                        <input v-model="settingShareTyping" type="checkbox">
                                    </label>
                                </form>
                            </div>
                        </tabbed-tab>
                        <tabbed-tab :header="$t('access')">
                            <a
                                :class="{
                                    'kiwi-sidebar-accesstab--active': accessTab === 'banlist'
                                }"
                                class="u-link kiwi-sidebar-accesstab"
                                @click="accessTab='banlist'"
                            >
                                {{ $t('banned') }}
                            </a>
                            <a
                                :class="{
                                    'kiwi-sidebar-accesstab--active': accessTab === 'invitelist'
                                }"
                                class="u-link kiwi-sidebar-accesstab"
                                @click="accessTab='invitelist'"
                            >
                                {{ $t('invited') }}
                            </a>
                            <channel-banlist v-if="accessTab==='banlist'" :buffer="buffer" />
                            <channel-invitelist v-if="accessTab==='invitelist'" :buffer="buffer" />
                        </tabbed-tab>
                        <tabbed-tab :header="$t('notifications')">
                            <buffer-settings :buffer="buffer" />
                        </tabbed-tab>
                        <tabbed-tab
                            v-for="item in pluginUiElements"
                            :key="item.id"
                            :header="item.title"
                        >
                            <div :is="item.component" v-bind="item.props" />
                        </tabbed-tab>
                    </tabbed-view>
                </div>

                <div
                    v-else-if="section === 'user'"
                    class="kiwi-sidebar-userbox"
                    @click.stop=""
                >
                    <user-box
                        :user="sidebarState.sidebarUser"
                        :buffer="buffer"
                        :network="network"
                    />
                </div>

                <nicklist
                    v-else-if="section === 'nicklist'"
                    :network="network"
                    :buffer="buffer"
                    :sidebar-state="sidebarState"
                />

                <sidebar-about-buffer
                    v-else-if="section === 'about'"
                    :network="network"
                    :buffer="buffer"
                    :sidebar-state="sidebarState"
                />
            </template>
            <template v-else-if="buffer.isQuery()">
                <div
                    v-if="section === 'user'"
                    class="kiwi-sidebar-userbox"
                    @click.stop=""
                >
                    <user-box
                        :user="sidebarState.sidebarUser"
                        :buffer="buffer"
                        :network="network"
                    />
                </div>
            </template>
        </template>
        <template v-else>
            {{ $t('side_buffer') }}
        </template>
    </div>
</template>

<script>
'kiwi public';

import UserBox from '@/components/UserBox';
import GlobalApi from '@/libs/GlobalApi';
import SidebarState from './SidebarState';
import BufferSettings from './BufferSettings';
import ChannelInfo from './ChannelInfo';
import SidebarAboutBuffer from './SidebarAboutBuffer';
import ChannelBanlist from './ChannelBanlist';
import ChannelInvitelist from './ChannelInvitelist';
import Nicklist from './Nicklist';

export { SidebarState as State };

export default {
    components: {
        BufferSettings,
        SidebarAboutBuffer,
        ChannelInfo,
        ChannelBanlist,
        ChannelInvitelist,
        Nicklist,
        UserBox,
    },
    props: ['network', 'buffer', 'sidebarState'],
    data() {
        return {
            pluginUiElements: GlobalApi.singleton().sideBarPlugins,
            accessTab: 'banlist',
        };
    },
    computed: {
        section() {
            if (this.sidebarState.activeComponent) {
                return 'component';
            }

            return this.sidebarState.section();
        },
        settingShowJoinParts: {
            get() {
                return this.buffer.setting('show_joinparts');
            },
            set(newVal) {
                return this.buffer.setting('show_joinparts', newVal);
            },
        },
        settingShowTopics: {
            get() {
                return this.buffer.setting('show_topics');
            },
            set(newVal) {
                return this.buffer.setting('show_topics', newVal);
            },
        },
        settingShowNickChanges: {
            get() {
                return this.buffer.setting('show_nick_changes');
            },
            set(newVal) {
                return this.buffer.setting('show_nick_changes', newVal);
            },
        },
        settingShowModeChanges: {
            get() {
                return this.buffer.setting('show_mode_changes');
            },
            set(newVal) {
                return this.buffer.setting('show_mode_changes', newVal);
            },
        },
        settingColouredNicklist: {
            get() {
                return this.buffer.setting('coloured_nicklist');
            },
            set(newVal) {
                return this.buffer.setting('coloured_nicklist', newVal);
            },
        },
        settingExtraFormatting: {
            get() {
                return this.buffer.setting('extra_formatting');
            },
            set(newVal) {
                return this.buffer.setting('extra_formatting', newVal);
            },
        },
        settingShareTyping: {
            get: function getSettingShareTyping() {
                return this.buffer.setting('share_typing');
            },
            set: function setSettingShareTyping(newVal) {
                return this.buffer.setting('share_typing', newVal);
            },
        },
        bufferType() {
            let type = '';

            if (!this.buffer) {
                type = 'none';
            } else if (this.buffer.isServer()) {
                type = 'server';
            } else if (this.buffer.isChannel()) {
                type = 'channel';
            } else if (this.buffer.isQuery()) {
                type = 'query';
            }

            return type;
        },
    },
};

</script>

<style lang="less">
.kiwi-sidebar {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 100;
}

.kiwi-sidebar.kiwi-sidebar-section-settings {
    width: 500px;
    max-width: 500px;
}

.kiwi-sidebar .u-form textarea {
    min-width: 100%;
    max-width: 100%;
    min-height: 80px;
    resize: vertical;
}

.kiwi-sidebar-buffersettings {
    overflow: hidden;
    height: 100%;
}

.kiwi-sidebar-buffersettings .u-tabbed-content {
    padding: 1em;
}

.kiwi-sidebar-userbox {
    overflow: hidden;
    height: 100%;
}

.kiwi-sidebar-settings {
    margin-bottom: 20px;
}

.kiwi-sidebar-settings label {
    display: block;
}

@keyframes settingstransition {
    from { margin-top: 50px; }
    to { margin-top: 100px; }
}

@keyframes nicklisttransition {
    from { height: 0; }
    to { height: 100%; }
}

.kiwi-sidebar-accesstab {
    margin-right: 1em;
}

.kiwi-sidebar-accesstab--active {
    font-weight: bold;
}

.kiwi-channelbanlist-empty {
    margin-top: 10px;
}

.kiwi-sidebar-options {
    display: none;
}

@media screen and (max-width: 769px) {
    .kiwi-sidebar-options {
        display: block;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
        position: relative;
        box-sizing: border-box;
        text-transform: uppercase;
        line-height: 47px;
        vertical-align: top;
    }

    .kiwi-sidebar-options .kiwi-sidebar-close {
        width: 100%;
        display: block;
        padding: 0 15px;
        height: 50px;
        line-height: 50px;
        text-align: right;
        box-sizing: border-box;
        letter-spacing: 2px;
        transition: background 0.3s;
    }

    .kiwi-sidebar-options .kiwi-sidebar-close i {
        margin-left: 5px;
        font-size: 1.5em;
        line-height: 47px;
        position: relative;
        top: 2px;
    }

    .kiwi-sidebar .u-tabbed-view-tab {
        width: 100%;
    }

    .kiwi-sidebar .u-tabbed-view-tab.u-tabbed-view-tab--active {
        border-bottom: 3px solid #42b992;
        margin-bottom: 0;
    }

    .kiwi-sidebar .u-form input[type="checkbox"] {
        margin-right: 4px;
    }

    .kiwi-sidebar .u-form label span {
        margin-right: 0;
        margin-left: 0;
    }

    .kiwi-container--sidebar-drawn .kiwi-sidebar {
        width: 100%;
        max-width: 100%;
    }

    .kiwi-sidebar-buffersettings {
        padding-bottom: 10px;
    }

    .kiwi-channelbanlist {
        float: left;
        width: 100%;
    }

    .kiwi-channelbanlist-table {
        margin-top: 30px;
    }

    .kiwi-channelbanlist .u-form {
        line-height: 10px;
    }
}

</style>
