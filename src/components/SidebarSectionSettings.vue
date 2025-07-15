<template>
    <div class="kiwi-sidebar-buffersettings" @click.stop="">
        <tabbed-view ref="tabs">
            <tabbed-tab :header="$t('settings')" :focus="true" name="settings">
                <div
                    :class="{'kiwi-sidebar-settings-disabled': !areWeAnOp}"
                    class="kiwi-sidebar-settings"
                >
                    <h3>
                        {{ $t('channel_settings') }}
                        <span
                            v-if="!areWeAnOp"
                            class="kiwi-channelsettings-disabled"
                        >
                            {{ $t('mods_only') }}
                            <i class="fa fa-lock" aria-hidden="true" />
                        </span>
                    </h3>
                    <hr>
                    <channel-info :buffer="buffer" />
                </div>

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
            <tabbed-tab :header="$t('access')" name="access">
                <div class="kiwi-sidebar-settings">
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
                </div>
            </tabbed-tab>
            <tabbed-tab :header="$t('notifications')" name="notifications">
                <div class="kiwi-sidebar-settings">
                    <buffer-settings :buffer="buffer" />
                </div>
            </tabbed-tab>
            <tabbed-tab
                v-for="item in pluginUiElements"
                :key="item.id"
                :header="item.title()"
                :name="item.tabName"
            >
                <component
                    :is="item.component"
                    v-bind="item.props"
                    :network="network"
                    :buffer="buffer"
                    :sidebar-state="sidebarState"
                />
            </tabbed-tab>
        </tabbed-view>
    </div>
</template>

<script>
'kiwi public';

import GlobalApi from '@/libs/GlobalApi';

import ChannelInfo from './ChannelInfo';
import ChannelBanlist from './ChannelBanlist';
import ChannelInvitelist from './ChannelInvitelist';
import BufferSettings from './BufferSettings';

// Helper to generate Vue's computed methods for getting/setting settings.
function generateComputedSetting(setting) {
    return {
        get() {
            return this.buffer.setting(setting);
        },
        set(newVal) {
            return this.buffer.setting(setting, newVal);
        },
    };
}

export default {
    components: {
        ChannelInfo,
        ChannelBanlist,
        ChannelInvitelist,
        BufferSettings,
    },
    props: ['network', 'buffer', 'sidebarState'],
    data() {
        return {
            pluginUiElements: GlobalApi.singleton().sideBarPlugins,
            accessTab: 'banlist',
        };
    },
    computed: {
        settingShowJoinParts: generateComputedSetting('show_joinparts'),
        settingShowTopics: generateComputedSetting('show_topics'),
        settingShowNickChanges: generateComputedSetting('show_nick_changes'),
        settingShowModeChanges: generateComputedSetting('show_mode_changes'),
        settingColouredNicklist: generateComputedSetting('coloured_nicklist'),
        settingExtraFormatting: generateComputedSetting('extra_formatting'),
        settingShareTyping: generateComputedSetting('share_typing'),
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
    },
};
</script>

<style lang="less">
.kiwi-sidebar-buffersettings {
    overflow: hidden;
    height: 100%;
}

.kiwi-sidebar-settings {
    padding: 0 1em 1em 1em;

    &:first-of-type {
        margin-top: 1em;
    }

    label {
        display: block;
    }
}

.kiwi-sidebar-settings-disabled {
    .u-form input[type='checkbox'] {
        cursor: not-allowed;
    }
}

.kiwi-channelsettings-disabled {
    float: right;
    border-radius: 4px;
    font-size: 0.8em;
    padding: 0 16px;

    > i {
        margin-left: 5px;
    }
}

.kiwi-sidebar-accesstab {
    margin-right: 1em;
}

.kiwi-sidebar-accesstab--active {
    font-weight: bold;
}

.kiwi-sidebar-settings-access-table {
    width: 100%;
    display: grid;
    grid-template-columns: 2fr minmax(0, 1fr) repeat(2, min-content);

    > div {
        border-bottom: 1px solid;
        padding-right: 4px;
    }

    &:not(.kiwi-sidebar-settings-access-restricted) {
        > div:nth-child(4n+4) {
            padding-right: initial;
        }
    }

    &.kiwi-sidebar-settings-access-restricted {
        grid-template-columns: 2fr minmax(0, 1fr) min-content;

        > div:nth-child(3n+3) {
            padding-right: initial;
        }
    }

    .kiwi-sidebar-settings-access-table-header {
        font-weight: 600;
        white-space: nowrap;
    }

    .kiwi-sidebar-settings-access-mask {
        word-break: break-all;
    }

    .kiwi-sidebar-settings-access-who {
        white-space: nowrap;
        overflow-x: hidden;
        text-overflow: ellipsis;
        position: relative;

        &:hover {
            white-space: initial;
            word-break: break-all;
        }
    }

    .kiwi-sidebar-settings-access-when {
        white-space: nowrap;
    }

    .kiwi-sidebar-settings-access-actions {
        text-align: center;
        position: relative;
        transition: all 0.3s;
        z-index: 1;

        > i {
            padding: 0 5px;
            cursor: pointer;
        }
    }
}
</style>
