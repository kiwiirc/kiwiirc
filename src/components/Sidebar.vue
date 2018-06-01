<template>
    <div class="kiwi-sidebar" :class="['kiwi-sidebar-section-' + uiState.section()]">
        <template v-if="buffer">
            <template v-if="buffer.isChannel()">

                <span v-if="uiState.isOpen" class="kiwi-sidebar-options">
                    <div v-if="uiState.canPin" @click="uiState.pin()" class="kiwi-sidebar-pin">
                        <i class="fa fa-thumb-tack" aria-hidden="true"></i>
                    </div>
                    <div @click="uiState.close()" class="kiwi-sidebar-close">
                        {{$t('close')}}<i class="fa fa-times" aria-hidden="true"></i>
                    </div>
                </span>

                <div
                    v-if="uiState.section() === 'settings'"
                    class="kiwi-sidebar-buffersettings"
                    @click.stop=""
                >

                    <tabbed-view>
                        <tabbed-tab :header="$t('settings')" :focus="true">
                            <h3>Channel Settings</h3>
                            <hr>
                            <channel-info v-bind:buffer="buffer"></channel-info>

                            <div class="kiwi-sidebar-settings">
                                <h3>{{$t('side_settings')}}</h3>
                                <hr>
                                <form class="u-form">
                                    <label class="u-checkbox-wrapper">
                                        <span>{{$t('side_joins')}}</span>
                                        <input type="checkbox" v-model="settingShowJoinParts">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{$t('side_topics')}}</span>
                                        <input type="checkbox" v-model="settingShowTopics">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{$t('side_nick_changes')}}</span>
                                        <input type="checkbox" v-model="settingShowNickChanges">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{$t('side_mode_changes')}}</span>
                                        <input type="checkbox" v-model="settingShowModeChanges">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{$t('side_formatting')}}</span>
                                        <input type="checkbox" v-model="settingExtraFormatting">
                                    </label>
                                    <label class="u-checkbox-wrapper">
                                        <span>{{$t('side_colours')}}</span>
                                        <input type="checkbox" v-model="settingColouredNicklist">
                                    </label>
                                </form>
                            </div>
                        </tabbed-tab>
                        <tabbed-tab :header="$t('banned')">
                            <channel-banlist v-bind:buffer="buffer"></channel-banlist>
                        </tabbed-tab>
                        <tabbed-tab :header="$t('notifications')">
                            <buffer-settings v-bind:buffer="buffer"></buffer-settings>
                        </tabbed-tab>
                        <tabbed-tab v-for="item in pluginUiElements" :key="item.id" :header="item.title">
                            <div v-bind:is="item.component" v-bind="item.props"></div>
                        </tabbed-tab>
                    </tabbed-view>
                </div>

                <div
                    v-if="uiState.section()==='user' && userbox_user"
                    class="kiwi-sidebar-userbox"
                    @click.stop=""
                >
                    <user-box
                        :user="userbox_user"
                        :buffer="buffer"
                        :network="network"
                    ></user-box>
                </div>

                <nicklist
                    v-if="buffer.isChannel() && uiState.section() === 'nicklist'"
                    :network="network"
                    :buffer="buffer"
                    :users="users"
                    :uiState="uiState"
                ></nicklist>
            </template>
            <template v-else-if="buffer.isQuery()">
                <!-- TODO:
                invite to an open channel<br />
                ignore this user<br />
                something else
                -->
            </template>
        </template>
        <template v-else>
            {{$t('side_buffer')}}
        </template>
    </div>
</template>

<script>

import state from '@/libs/state';
import BufferSettings from './BufferSettings';
import ChannelInfo from './ChannelInfo';
import ChannelBanlist from './ChannelBanlist';
import UserBox from '@/components/UserBox';
import Nicklist from './Nicklist';
import GlobalApi from '@/libs/GlobalApi';

export default {
    components: {
        BufferSettings,
        ChannelInfo,
        ChannelBanlist,
        Nicklist,
        UserBox,
    },
    data: function data() {
        return {
            userbox_user: null,
            pluginUiElements: GlobalApi.singleton().sideBarPlugins,
        };
    },
    props: ['network', 'buffer', 'users', 'uiState'],
    computed: {
        isSettingsOpen: {
            get() {
                return !this.uiState.isClosed && this.uiState.sidebarSection === 'settings';
            },
            set(newVal) {
                if (newVal) {
                    this.uiState.sidebarOpen = true;
                    this.uiState.sidebarSection = 'settings';
                } else {
                    this.uiState.sidebarOpen = false;
                    this.uiState.sidebarSection = '';
                }
            },
        },
        settingShowJoinParts: {
            get: function getSettingShowJoinParts() {
                return this.buffer.setting('show_joinparts');
            },
            set: function setSettingShowJoinParts(newVal) {
                return this.buffer.setting('show_joinparts', newVal);
            },
        },
        settingShowTopics: {
            get: function getSettingShowTopics() {
                return this.buffer.setting('show_topics');
            },
            set: function setSettingShowTopics(newVal) {
                return this.buffer.setting('show_topics', newVal);
            },
        },
        settingShowNickChanges: {
            get: function getSettingShowNickChanges() {
                return this.buffer.setting('show_nick_changes');
            },
            set: function setSettingShowNickChanges(newVal) {
                return this.buffer.setting('show_nick_changes', newVal);
            },
        },
        settingShowModeChanges: {
            get: function getSettingShowModeChanges() {
                return this.buffer.setting('show_mode_changes');
            },
            set: function setSettingShowModeChanges(newVal) {
                return this.buffer.setting('show_mode_changes', newVal);
            },
        },
        settingColouredNicklist: {
            get: function getSettingShowJoinParts() {
                return this.buffer.setting('coloured_nicklist');
            },
            set: function setSettingShowJoinParts(newVal) {
                return this.buffer.setting('coloured_nicklist', newVal);
            },
        },
        settingExtraFormatting: {
            get: function settingExtraFormatting() {
                return this.buffer.setting('extra_formatting');
            },
            set: function settingExtraFormatting(newVal) {
                return this.buffer.setting('extra_formatting', newVal);
            },
        },
        bufferType: function bufferType() {
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
    methods: {
    },
    created: function created() {
        this.listen(state, 'sidebar.hide', () => {
            this.uiState.sidebarOpen = false;
        });

        this.listen(state, 'userbox.show', (user) => {
            this.userbox_user = user;
            this.uiState.sidebarSection = 'user';
            this.uiState.sidebarOpen = true;
        });
        this.listen(state, 'userbox.hide', () => {
            this.userbox_user = null;
            this.uiState.close();
        });
    },
};
</script>

<style lang="less">
.kiwi-sidebar {
    background: #fff;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 10;
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

.kiwi-sidebar-options {
    display: block;
    cursor: pointer;
    font-weight: 600;
    width: 100%;
    position: relative;
    box-sizing: border-box;
    text-transform: uppercase;
    line-height: 50px;
    vertical-align: top;
}

.kiwi-sidebar-options .kiwi-sidebar-pin {
    position: absolute;
    padding: 0 10px;
    height: 100%;
    line-height: 52px;
    z-index: 1;
    transition: background 0.3s;
}

.kiwi-sidebar-options .kiwi-sidebar-close {
    width: 100%;
    display: inline-block;
    padding: 0 20px 0 40px;
    text-align: right;
    box-sizing: border-box;
    transition: background 0.3s;
}

.kiwi-sidebar-options .kiwi-sidebar-close i {
    margin-left: 10px;
    font-size: 1.5em;
    line-height: 47px;
}

.kiwi-sidebar-buffersettings {
    overflow: hidden;
    height: 100%;
}

.kiwi-sidebar-buffersettings .u-tabbed-content {
    padding: 1em;
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

.kiwi-channelbanlist-empty {
    margin-top: 10px;
}

@media screen and (max-width: 769px) {
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

    .kiwi-container--sidebar-open .kiwi-sidebar {
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

    .kiwi-sidebar-options {
        line-height: 47px;
    }
}

</style>
