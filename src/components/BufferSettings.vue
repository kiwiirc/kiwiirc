<template>
    <div class="kiwi-buffersettings">
        <div class="kiwi-buffersettings-alerts">
            <h3>{{ $t('settings_notify') }}</h3>
            <hr>
            <form class="u-form">
                <label class="u-checkbox-wrapper">
                    <input v-model="settingAlertOn" type="radio" name="alert_on" value="message">
                    <span>{{ $t('settings_notify_all') }}</span>
                </label>
                <label class="u-checkbox-wrapper">
                    <input v-model="settingAlertOn" type="radio" name="alert_on" value="highlight">
                    <span>{{ $t('settings_notify_mentioned') }}</span>
                </label>
                <label class="u-checkbox-wrapper">
                    <input v-model="settingAlertOn" type="radio" name="alert_on" value="never">
                    <span>{{ $t('settings_notify_never') }}</span>
                </label>
            </form>

            <h3>{{ $t('settings') }}</h3>
            <hr>
            <form class="u-form">
                <label>
                    <span>{{ $t('settings_notify_mute') }}</span>
                    <input v-model="settingMuteSound" type="checkbox">
                </label>
                <label>
                    <span>{{ $t('settings_show_message_counts') }}</span>
                    <input v-model="settingHideMessageCount" type="checkbox">
                </label>
            </form>
        </div>
    </div>
</template>

<script>
'kiwi public';

export default {
    components: {
    },
    props: ['buffer'],
    data: function data() {
        return {
        };
    },
    computed: {
        settingAlertOn: {
            get: function getSettingAlertOn() {
                return this.buffer.setting('alert_on');
            },
            set: function setSettingAlertOn(val) {
                let network = this.buffer.getNetwork();
                let netId = network.connection.bncnetid;
                if (netId) {
                    // If this buffer is on a BOUNCER account, update the setting there too
                    // TODO: Move this to BouncerProvider snapshots
                    network.ircClient.raw(
                        `BOUNCER changebuffer ${netId} ${this.buffer.name} notify=${val}`
                    );
                }

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
