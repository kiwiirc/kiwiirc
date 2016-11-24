<template>
    <div class="kiwi-networksettings">
        <h3>{{network.name}}</h3>
        <div v-if="network.state === 'connected'">
            Connected
        </div>
        <div v-else>
            Not connected. <a @click="reconnect">Reconnect</a>
        </div>

        <div class="kiwi-networksettings-connection">
            <label>Server: <input v-model="network.connection.server" /></label><br />
            <label>Port: <input v-model="network.connection.port" /></label><br />
            <label>SSL/TLS: <input v-model="network.connection.tls" type="checkbox" /></label><br />
            <label>Password: <input v-model="network.connection.password" /></label>
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
