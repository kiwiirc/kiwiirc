<template>
    <div class="kiwi-appsettings">
        <a @click="closeSettings" class="u-button u-button-secondary kiwi-appsettings-close">Close</a>

        <form class="u-form">
            <div class="kiwi-appsettings-section kiwi-appsettings-messages">
                <h3>Chat Messages</h3>
                <label><span>Show timestamps:</span> <input type="checkbox" v-model="bufferSettings.show_timestamps" /></label>
                <label><span>Use 24-hour timestamps:</span> <input type="checkbox" v-model="timestamps_24h" /></label>
                <label><span>Show emoticons:</span> <input type="checkbox" v-model="bufferSettings.show_emoticons" /></label>
                <label><span>Block new private messages:</span> <input type="checkbox" v-model="bufferSettings.block_pms" /></label>
                <label><span>Messages in scrollback:</span> <input type="number" v-model="bufferSettings.scrollback_size" /></label>
            </div>

            <div class="kiwi-appsettings-section kiwi-appsettings-notifications">
                <h3>Notifications</h3>
                <label><span>Include join/part messages as activity:</span> <input type="checkbox" v-model="bufferSettings.traffic_as_activity" /></label>
                <label><span>Mute sound notifications:</span> <input type="checkbox" v-model="bufferSettings.mute_sound" /></label>
                <label><span>Highlight on words (space separated):</span> <input type="text" /></label>
            </div>

            <div class="kiwi-appsettings-section kiwi-appsettings-aliases">
                <h3>Aliases</h3>
                <settings-aliases></settings-aliases>
            </div>
        </form>
    </div>
</template>

<script>

import state from 'src/libs/state';
import SettingsAliases from './SettingsAliases';

export default {
    data: function data() {
        return {
            state,
        };
    },
    computed: {
        timestamps_24h: {
            get: function get24Timestamps() {
                // %H is 24 hour format
                return state.settings.buffers.timestamp_format.substr(0, 2) === '%H';
            },
            set: function set24Timestamps(newVal) {
                state.settings.buffers.timestamp_format = newVal ?
                    '%H:%M:%S' :
                    '%l:%M:%S';
            },
        },
        settings: function getSettings() {
            return state.settings;
        },
        bufferSettings: function bufferSettings() {
            return state.settings.buffers;
        },
    },
    props: [],
    components: {
        SettingsAliases,
    },
    methods: {
        closeSettings: function closeSettings() {
            state.$emit('active.component');
        },
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
</style>
