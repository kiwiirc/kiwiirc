<template>
    <div class="kiwi-appsettings">
        <a @click="closeSettings" class="u-button u-button-secondary kiwi-appsettings-close">{{$t('close')}}</a>

        <form class="u-form">
            <tabbed-view>
                <tabbed-tab :header="$t('settings_general')" :focus="true">
                    <div class="kiwi-appsettings-section kiwi-appsettings-general">
                        <h3>{{$t('settings_general')}}</h3>
                        <label>
                            <span>{{$t('settings_theme')}}: </span>
                            <select v-model="theme">
                                <option v-for="t in settings.themes" :value="t.name">{{t.name}}</option>
                            </select>
                            <a @click="refreshTheme" title="Refresh Theme" class="kiwi-appsettings-theme-reload"><i class="fa fa-refresh" aria-hidden="true"></i></a>
                        </label>
                        <label v-if="theme==='custom'">
                            <span>{{$t('settings_themeurl')}}: </span>
                            <input v-model="customThemeUrl" class="u-input">
                       </label>
                        <label>
                            <span>{{$t('settings_show_autocomplete')}}: </span>
                            <input type="checkbox" v-model="settingShowAutoComplete" />
                        </label>
                        <label v-if="themeSupportsMonospace">
                            <span>{{$t('settings_use_monospace')}}: </span>
                            <input type="checkbox" v-model="settingUseMonospace" />
                        </label>
                    </div>

                    <div class="kiwi-appsettings-section kiwi-appsettings-messages">
                        <h3>{{$t('settings_messages_title')}}</h3>
                        <label>
                            <span>{{$t('settings_layout_compact')}}: </span>
                            <input type="checkbox" v-model="settingMessageLayout" />
                        </label>
                        <label><span>{{$t('settings_timestamps')}}: </span> <input type="checkbox" v-model="settingBufferShowTimestamps" /></label>
                        <label><span>{{$t('settings_24hour_timestamps')}}: </span> <input type="checkbox" v-model="timestamps_24h" /></label>
                        <label><span>{{$t('settings_emoticons')}}: </span> <input type="checkbox" v-model="settingBufferShowEmoticons" /></label>
                        <label><span>{{$t('settings_block_private')}}: </span> <input type="checkbox" v-model="settingBufferBlockPms" /></label>
                        <label><span>{{$t('settings_scrollback')}}: </span> <input type="number" class="u-input" v-model="settingBufferScrollbackSize" /></label>
                        <label><span>{{$t('settings_formatting')}}: </span> <input type="checkbox" v-model="settingBufferExtraFormatting" /></label>
                        <label><span>{{$t('settings_nick_colouring')}}: </span> <input type="checkbox" v-model="settingBufferColourNicknames" /></label>
                    </div>

                    <div class="kiwi-appsettings-section kiwi-appsettings-notifications">
                        <h3>{{$t('notifications')}}</h3>
                        <label><span>{{$t('settings_show_joinpart')}}: </span> <input type="checkbox" v-model="settingBufferTrafficAsActivity" /></label>
                        <label><span>{{$t('settings_mute_sound')}}: </span> <input type="checkbox" v-model="settingBufferMuteSound" /></label>
                        <label><span>{{$t('settings_highlight')}}: </span> <input type="text" class="u-input" v-model="settingHighlights" /></label>
                    </div>

                    <div class="kiwi-appsettings-section kiwi-appsettings-operator-tools">
                        <h3>{{$t('operator_tools')}}</h3>
                        <label><span>{{$t('settings_default_ban_mask')}}: </span> <input type="text" class="u-input" v-model="settingDefaultBanMask" /></label>
                        <label><span>{{$t('settings_default_kick_reason')}}: </span> <input type="text" class="u-input" v-model="settingDefaultKickReason" /></label>
                    </div>
                </tabbed-tab>

                <tabbed-tab :header="$t('settings_aliases')">
                    <div class="kiwi-appsettings-section kiwi-appsettings-aliases">
                        <h3>{{$t('settings_aliases')}}</h3>
                        <settings-aliases></settings-aliases>
                    </div>
                </tabbed-tab>
            </tabbed-view>
        </form>
    </div>
</template>

<script>

import state from '@/libs/state';
import SettingsAliases from './SettingsAliases';
import ThemeManager from '@/libs/ThemeManager';

/**
 * Returns an object for a vuejs computated property on a state settings value
 * This allows default settings from the server config, but overrides with user config
 */
function bindSetting(settingName) {
    return {
        get: function settingGetter() {
            return this.state.setting(settingName);
        },
        set: function settingSetter(newVal) {
            this.state.setting(settingName, newVal);
        },
    };
}

export default {
    data: function data() {
        return {
            state: state,
            theme: '',
            customThemeUrl: '',
        };
    },
    computed: {
        themeSupportsMonospace: function themeSupportsMonospace() {
            let themeMgr = ThemeManager.instance();
            let val = themeMgr.themeVar('supports-monospace');
            return val === '1';
        },
        timestamps_24h: {
            get: function get24Timestamps() {
                // %H is 24 hour format
                return state.setting('buffers.timestamp_format').substr(0, 2) === '%H';
            },
            set: function set24Timestamps(newVal) {
                let newFormat = newVal ?
                    '%H:%M:%S' :
                    '%l:%M:%S';
                state.setting('buffers.timestamp_format', newFormat);
            },
        },
        settings: function getSettings() {
            return state.settings;
        },
        settingShowAutoComplete: bindSetting('showAutocomplete'),
        settingUseMonospace: bindSetting('useMonospace'),
        settingHighlights: bindSetting('highlights'),
        settingBufferColourNicknames: bindSetting('buffers.colour_nicknames_in_messages'),
        settingBufferShowTimestamps: bindSetting('buffers.show_timestamps'),
        settingBufferShowEmoticons: bindSetting('buffers.show_emoticons'),
        settingBufferBlockPms: bindSetting('buffers.block_pms'),
        settingBufferScrollbackSize: bindSetting('buffers.scrollback_size'),
        settingBufferExtraFormatting: bindSetting('buffers.extra_formatting'),
        settingBufferTrafficAsActivity: bindSetting('buffers.traffic_as_activity'),
        settingBufferMuteSound: bindSetting('buffers.mute_sound'),
        settingDefaultBanMask: bindSetting('buffers.default_ban_mask'),
        settingDefaultKickReason: bindSetting('buffers.default_kick_reason'),
        settingMessageLayout: {
            get: function getSettingMessageLayout() {
                return state.setting('messageLayout') === 'compact';
            },
            set: function setSettingMessageLayout(newVal) {
                if (newVal) {
                    state.setting('messageLayout', 'compact');
                } else {
                    state.setting('messageLayout', 'modern');
                }
            },
        },
    },
    components: {
        SettingsAliases,
    },
    methods: {
        closeSettings: function closeSettings() {
            state.$emit('active.component');
        },
        refreshTheme: function refreshTheme() {
            ThemeManager.instance().reload();
        },
        listenForThemeSettings: function listenForThemeSettings() {
            let themeMgr = ThemeManager.instance();
            let watches = [];

            // Called when the current theme changes (including url refreshes)
            let updateFn = () => {
                let theme = themeMgr.currentTheme();
                this.theme = theme.name;
                this.customThemeUrl = theme.name === 'custom' ?
                    theme.url :
                    '';
            };

            let watchTheme = (newVal) => {
                themeMgr.setTheme(newVal);
            };

            let watchCustomThemeUrl = (newVal) => {
                if (themeMgr.currentTheme().name === 'custom') {
                    themeMgr.setCustomThemeUrl(newVal);
                }
            };

            // Remove all our attached events to cleanup
            let teardownFn = () => {
                this.state.$off('theme.change', updateFn);
                watches.forEach(unwatchFn => unwatchFn());
                this.$off('hook:destroy', teardownFn);
            };

            // Update our info with the latest theme settings before we start
            // listening for changes
            updateFn();

            this.state.$on('theme.change', updateFn);
            this.$once('hook:destroyed', teardownFn);

            // $watch returns a function to stop watching the data field. Add them into
            // an array to make it easier to iterate over them all and unwatch them all
            // when needed.
            watches = [
                this.$watch('theme', watchTheme),
                this.$watch('customThemeUrl', watchCustomThemeUrl),
            ];
        },
    },
    created: function created() {
        this.listenForThemeSettings();
    },
};
</script>

<style>

.kiwi-appsettings {
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
    padding: 1em;
}
.kiwi-appsettings-close {
    float: right;
}
.kiwi-appsettings .u-form label {
    display: block;
}
.kiwi-appsettings .u-form label span {
    width: 200px;
}
.kiwi-appsettings-aliases > div {
    margin-left: 30px;
}
.kiwi-appsettings-theme-reload {
    margin-left: 1em;
    cursor: pointer;
}
</style>
