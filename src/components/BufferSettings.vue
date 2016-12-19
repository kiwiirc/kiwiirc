<template>
    <div class="kiwi-buffersettings">
        {{buffer.name}}
        <div class="kiwi-buffersettings-alerts">
            <b>Notify me when:</b><br />
            <input type="radio" name="alert_on" value="message" v-model="settingAlertOn">All messages<br />
            <input type="radio" name="alert_on" value="highlight" v-model="settingAlertOn">Somebody mentions me<br />
            <input type="radio" name="alert_on" value="never" v-model="settingAlertOn">Never
        </div>
        <a @click="closeBuffer" class="u-link">Close {{buffer.name}}</a>
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
    color: #bdbdbd;
}

</style>
