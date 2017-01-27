<template>
    <div class="kiwi-buffersettings">
        <div class="kiwi-buffersettings-alerts">
            <form class="u-form">
                <b>Notify me when:</b><br />
                <label>
                    <span>All messages</span>
                    <input type="radio" name="alert_on" value="message" v-model="settingAlertOn">
                </label><br />
                <label>
                    <span>I am mentioned</span>
                    <input type="radio" name="alert_on" value="highlight" v-model="settingAlertOn">
                </label><br />
                <label>
                    <span>Never</span>
                    <input type="radio" name="alert_on" value="never" v-model="settingAlertOn">
                </label><br />

                <label>
                    <span>Mute sounds</span>
                    <input type="checkbox" v-model="settingMuteSound">
                </label><br />
            </form>
        </div>
        <a @click="closeBuffer" class="u-link">Leave {{buffer.name}}</a>
    </div>
</template>

<script>

import state from 'src/libs/state';

export default {
    data: function data() {
        return {
        };
    },
    props: ['buffer'],
    components: {
    },
    computed: {
        settingAlertOn: {
            get: function getSettingAlertOn() {
                return this.buffer.setting('alert_on');
            },
            set: function setSettingAlertOn(val) {
                return this.buffer.setting('alert_on', val);
            },
        },
        settingMuteSound: {
            get: function getSettingAlertOn() {
                return this.buffer.setting('mute_sound');
            },
            set: function setSettingAlertOn(val) {
                return this.buffer.setting('mute_sound', val);
            },
        },
    },
    methods: {
        closeBuffer: function closeBuffer() {
            state.removeBuffer(this.buffer);
        },
    },
};
</script>

<style>

.kiwi-buffersettings {
    box-sizing: border-box;
}
.kiwi-buffersettings-alerts {
    margin-bottom: 1em;
}

</style>
