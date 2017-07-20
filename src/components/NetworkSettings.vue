<template>
    <div class="kiwi-networksettings">
        <a @click="closeSettings" class="u-button u-button-secondary kiwi-networksettings-close">Close</a>

        <h3>{{network.name}}</h3>
        <div v-if="network.state === 'connected'">
            Connected
        </div>
        <div v-else-if="network.state === 'connecting'">
            Connecting...
        </div>
        <div v-else>
            <a @click="reconnect" class="u-button u-button-primary">Connect</a>
        </div>

        <form class="u-form">
            <div class="kiwi-networksettings-section kiwi-networksettings-connection">
                <h3>Server details</h3>

                <input-text :label="$t('connection_server')" v-model="network.connection.server" class="kiwi-networksettings-connection-address"/>

                <input-text label="Port" v-model="network.connection.port" type="number" class="kiwi-networksettings-connection-port">
                    <span class="fa-stack fa-lg kiwi-customserver-tls" :class="[network.connection.tls ? 'kiwi-customserver-tls--enabled' : '']" @click="toggleTls">
                        <i class="fa fa-lock fa-stack-1x kiwi-customserver-tls-lock"></i>
                        <i v-if="!network.connection.tls" class="fa fa-times fa-stack-1x kiwi-customserver-tls-minus"></i>
                    </span>
                </input-text>

                <div class="kiwi-networksettings-connection-password">
                    <template v-if="server_type==='network'">
                        <input-text label="Password" v-model="network.connection.password" type="password" />
                    </template>
                    <template v-else>
                        <input-text label="Username" v-model="znc_username" />
                        <input-text label="Network" v-model="znc_network" />
                        <input-text label="Password" v-model="znc_password" type="password" />
                    </template>
                </div>

                <div class="kiwi-networksettings-server-types">
                    <div v-if="server_type==='znc'" class="kiwi-networksettings-server-types-info">
                        Other networks on this ZNC account will be listed in the network list
                    </div>
                    <a
                        @click="server_type='network'"
                        class="u-link"
                        :class="{'kiwi-networksettings-server-type-active': server_type==='network'}"
                    >Network</a>
                    <a
                        @click="server_type='znc'"
                        class="u-link"
                        :class="{'kiwi-networksettings-server-type-active': server_type==='znc'}"
                    >ZNC</a>
                </div>
            </div>

            <div class="kiwi-networksettings-section  kiwi-networksettings-user">
                <h3>Your details</h3>
                <label><span>Nickname:</span> <input v-model="network.nick" /></label>
            </div>

            <div class="kiwi-networksettings-section kiwi-networksettings-advanced">
                <h3>Advanced</h3>
                <label><span>Encoding</span> <input v-model="network.connection.encoding" /></label><br />
                <label><span>Show Raw</span> <input v-model="settingShowRaw" type="checkbox" /></label><br />
                <label class="u-form-block">
                    <span>Run commands when connected</span>
                    <textarea v-model="network.auto_commands" cols=40 rows=5></textarea>
                </label><br />
            </div>

            <div class="kiwi-networksettings-section kiwi-networksettings-danger">
                <h3>Danger zone</h3>
                <label><a class="u-button u-button-warning" @click="removeNetwork">Remove network</a></label><br />
            </div>
        </form>
    </div>
</template>

<script>

import state from 'src/libs/state';

export default {
    data: function data() {
        return {
            server_type: 'network',
            znc_username: '',
            znc_network: '',
            znc_password: '',
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
            state.$emit('active.component');
        },
        closeSettings: function closeSettings() {
            state.$emit('active.component');
        },
        setZncPass: function setZncPass() {
            let newPass = `${this.znc_username}/${this.znc_network}:${this.znc_password}`;
            this.network.connection.password = newPass;
        },
        toggleTls: function toggleTls() {
            let connection = this.network.connection;
            connection.tls = !connection.tls;

            // Switching the port only if were currently using the most common TLS/plain text ports
            if (connection.tls && connection.port === 6667) {
                connection.port = 6697;
            } else if (!connection.tls && connection.port === 6697) {
                connection.port = 6667;
            }
        },
    },
    watch: {
        znc_username: function watchZncUsername() {
            this.setZncPass();
        },
        znc_network: function watchZncNetwork() {
            this.setZncPass();
        },
        znc_password: function watchZncPassword() {
            this.setZncPass();
        },
    },
    created: function created() {
        let isZnc = !!(this.network.connection.password || '').match(/^(.*)\/(.*):(.*)$/);
        this.server_type = isZnc ?
            'znc' :
            'network';
        if (isZnc) {
            let match = (this.network.connection.password || '').match(/^(.*)\/(.*):(.*)$/);
            this.znc_username = match[1] || '';
            this.znc_network = match[2] || '';
            this.znc_password = match[3] || '';
        }
    },
    mounted: function mounted() {
        this.$nextTick(() => {
            this.$el.querySelector('.kiwi-networksettings-connection-address input').focus();
        });
    },
};
</script>

<style>

.kiwi-networksettings {
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
}
.kiwi-networksettings-close {
    float: right;
}
.kiwi-networksettings form .input-text {
    margin-bottom: 10px;
}
.kiwi-networksettings-connection {
    max-width: 400px;
}
.kiwi-networksettings-server-types {
    margin-top: 1em;
    text-align: center;
}
.kiwi-networksettings-server-types a {
    margin-right: 1em;
}
.kiwi-networksettings-server-type-active {
    font-weight: bold;
}
</style>
