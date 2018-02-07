<template>
    <div class="kiwi-buffersettings">
        <div class="kiwi-buffersettings-alerts">
            <form class="u-form">
                <b>{{$t('settings_notify')}}: </b><br />
                <label>
                    <span>{{$t('settings_notify_all')}}</span>
                    <input type="radio" name="alert_on" value="message" v-model="settingAlertOn">
                </label><br />
                <label>
                    <span>{{$t('settings_notify_mentioned')}}</span>
                    <input type="radio" name="alert_on" value="highlight" v-model="settingAlertOn">
                </label><br />
                <label>
                    <span>{{$t('settings_notify_never')}}</span>
                    <input type="radio" name="alert_on" value="never" v-model="settingAlertOn">
                </label><br />

                <label>
                    <span>{{$t('settings_notify_mute')}}</span>
                    <input type="checkbox" v-model="settingMuteSound">
                </label><br />
                <label>
                    <span>{{$t('settings_show_message_counts')}}</span>
                    <input type="checkbox" v-model="settingHideMessageCount">
                </label><br />
            </form>
        </div>
    </div>
</template>

<script>

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
        settingHideMessageCount: {
            get: function getsettingHideMessageCount() {
                return this.buffer.setting('hide_message_counts');
            },
            set: function setsettingHideMessageCount(val) {
                return this.buffer.setting('hide_message_counts', val);
            },
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
