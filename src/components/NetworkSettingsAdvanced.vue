<template>
    <div class="kiwi-networksettings">
        <form class="u-form">
            <div class="kiwi-networksettings-section kiwi-networksettings-advanced">
                <label><span>{{$t('settings_encoding')}}: </span> <input v-model="network.connection.encoding" /></label><br />
                <label><span>{{$t('settings_show_raw')}}: </span> <input v-model="settingShowRaw" type="checkbox" /></label><br />
                <label class="u-form-block">
                    <span>{{$t('settings_autorun')}}</span>
                    <textarea v-model="network.auto_commands" cols=40 rows=5></textarea>
                </label><br />
            </div>
        </form>
    </div>
</template>

<script>

import state from 'src/libs/state';

export default {
    data: function data() {
        return {
        };
    },
    computed: {
        settingShowRaw: {
            get: function getSettingAlertOn() {
                return this.network.setting('show_raw');
            },
            set: function setSettingAlertOn(val) {
                return this.network.setting('show_raw', val);
            },
        },
    },
    props: ['network'],
    components: {
    },
    methods: {
        removeNetwork: function removeNetwork() {
            let confirmed = confirm('Really remove this network? This cannot be undone!');
            if (!confirmed) {
                return;
            }

            state.removeNetwork(this.network.id);
            state.$emit('active.component');
        },
    },
    watch: {
    },
    created: function created() {
    },
};
</script>

<style>

</style>
