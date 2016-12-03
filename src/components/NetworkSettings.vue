<template>
    <div class="kiwi-networksettings">
        <h3>{{network.name}}</h3>
        <div v-if="network.state === 'connected'">
            Connected
        </div>
        <div v-else>
            Not connected. <a @click="reconnect">Connect</a>
        </div>

        <div class="kiwi-networksettings-connection">
            <label>Server: <input v-model="network.connection.server" /></label><br />
            <label>Port: <input v-model="network.connection.port" /></label><br />
            <label>SSL/TLS: <input v-model="network.connection.tls" type="checkbox" /></label><br />
            <label>Password: <input v-model="network.connection.password" /></label>
        </div>

        <div class="kiwi-networksettings-user">
            <h3>Your details</h3>
            <label>Nickname: <input v-model="network.nick" /></label>
        </div>

        <div class="kiwi-networksettings-advanced">
            <h3>Advanced</h3>
            <label>Show Raw <input v-model="settingShowRaw" type="checkbox" /></label><br />
        </div>
    </div>
</template>

<script>
import MessageList from './MessageList';

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
        MessageList,
    },
    methods: {
        reconnect: function reconnect() {
            this.network.ircClient.connect();
        },
    },
};
</script>

<style>

.kiwi-networksettings {
    box-sizing: border-box;
}

</style>
