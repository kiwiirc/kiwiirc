<template>
    <div class="kiwi-networksettings">
        <a @click="closeSettings" class="u-button u-button-secondary kiwi-networksettings-close">Close</a>

        <h3>{{network.name}}</h3>
        <div v-if="network.state === 'connected'">
            Connected
        </div>
        <div v-else>
            Not connected. <a @click="reconnect">Connect</a>
        </div>

        <div class="kiwi-networksettings-section kiwi-networksettings-connection">
            <label>Server: <input v-model="network.connection.server" /></label><br />
            <label>Port: <input v-model="network.connection.port" /></label><br />
            <label>SSL/TLS: <input v-model="network.connection.tls" type="checkbox" /></label><br />
            <label>Password: <input v-model="network.connection.password" /></label>
        </div>

        <div class="kiwi-networksettings-section  kiwi-networksettings-user">
            <h3>Your details</h3>
            <label>Nickname: <input v-model="network.nick" /></label>
        </div>

        <div class="kiwi-networksettings-section kiwi-networksettings-advanced">
            <h3>Advanced</h3>
            <label>Show Raw <input v-model="settingShowRaw" type="checkbox" /></label><br />
        </div>

        <div class="kiwi-networksettings-section kiwi-networksettings-danger">
            <h3>Danger zone</h3>
            <label><a class="u-button u-button-warning" @click="removeNetwork">Remove network</a></label><br />
        </div>
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
        reconnect: function reconnect() {
            this.network.ircClient.connect();
        },
        removeNetwork: function removeNetwork() {
            let confirmed = confirm('Really remove this network? This cannot be undone!');
            if (!confirmed) {
                return;
            }

            state.removeNetwork(this.network.id);
        },
        closeSettings: function closeSettings() {
            state.$emit('active.component');
        },
    },
};
</script>

<style>

.kiwi-networksettings {
    box-sizing: border-box;
}
.kiwi-networksettings-close {
    float: right;
}
</style>
