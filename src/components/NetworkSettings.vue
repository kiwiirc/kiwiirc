<template>
    <div class="kiwi-networksettings">
        <form class="u-form">
            <div class="kiwi-networksettings-section kiwi-networksettings-connection">
                <h3>{{$t('settings_server_details')}}</h3>

                <div class="kiwi-networksettings-error" v-if="network.state_error">We couldn't connect to that server :( <span>{{readableStateError(network.state_error)}}</span></div>

                <input-text :label="$t('server')" v-model="network.connection.server" class="kiwi-networksettings-connection-address"/>

                <input-text :label="$t('settings_port')" v-model="network.connection.port" type="number" class="kiwi-networksettings-connection-port">
                    <span class="fa-stack fa-lg kiwi-customserver-tls" :class="[network.connection.tls ? 'kiwi-customserver-tls--enabled' : '']" @click="toggleTls">
                        <i class="fa fa-lock fa-stack-1x kiwi-customserver-tls-lock"></i>
                        <i v-if="!network.connection.tls" class="fa fa-times fa-stack-1x kiwi-customserver-tls-minus"></i>
                    </span>
                </input-text>

                <div class="kiwi-networksettings-connection-password">
                    <template v-if="server_type==='network'">
                        <input-text :label="$t('password')" v-model="network.connection.password" type="password" />
                    </template>
                    <template v-else>
                        <input-text :label="$t('username')" v-model="znc_username" />
                        <input-text :label="$t('network')" v-model="znc_network" />
                        <input-text :label="$t('password')" v-model="znc_password" type="password" />
                    </template>
                </div>

                <div class="kiwi-networksettings-server-types">
                    <div v-if="server_type==='znc'" class="kiwi-networksettings-server-types-info">
                        {{$t('settings_znc_other')}}
                    </div>
                    <a
                        @click="server_type='network'"
                        class="u-link"
                        :class="{'kiwi-networksettings-server-type-active': server_type==='network'}"
                    >{{$t('network')}}</a>
                    <a
                        @click="server_type='znc'"
                        class="u-link"
                        :class="{'kiwi-networksettings-server-type-active': server_type==='znc'}"
                    >{{$t('znc')}}</a>
                </div>
            </div>

            <div class="kiwi-networksettings-section  kiwi-networksettings-user">
                <h3>{{$t('settings_nickname')}}</h3>
                <input-text :label="$t('settings_nickname')" v-model="network.nick" />
            </div>

            <div class="kiwi-networksettings-section kiwi-networksettings-advanced">
                <h3 @click="show_advanced=!show_advanced">{{$t('settings_advanced')}} <i class="fa" :class="['fa-caret-'+(show_advanced?'up':'down')]" aria-hidden="true"></i></h3>
                <template v-if="show_advanced">
                    <label><span>{{$t('settings_encoding')}}: </span> <input v-model="network.connection.encoding" /></label><br />
                    <label><span>{{$t('settings_show_raw')}}: </span> <input v-model="settingShowRaw" type="checkbox" /></label><br />
                    <label class="u-form-block">
                        <span>{{$t('settings_autorun')}}</span>
                        <textarea v-model="network.auto_commands" cols=40 rows=5></textarea>
                    </label>
                </template>
            </div>

            <div class="kiwi-networksettings-section kiwi-networksettings-danger">
                <h3>{{$t('settings_danger')}}</h3>
                <label><a class="u-button u-button-warning" @click="removeNetwork">{{$t('settings_remove')}}</a></label><br />
            </div>
        </form>
    </div>
</template>

<script>

import state from '@/libs/state';
import * as Misc from '@/helpers/Misc';

export default {
    data: function data() {
        return {
            server_type: 'network',
            znc_username: '',
            znc_network: '',
            znc_password: '',
            show_advanced: false,
        };
    },
    props: ['network'],
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
    components: {
    },
    methods: {
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        reconnect: function reconnect() {
            this.network.ircClient.connect();
        },
        removeNetwork: function removeNetwork() {
            /* eslint-disable no-restricted-globals */
            let confirmed = confirm('Really remove this network? This cannot be undone!');
            if (!confirmed) {
                return;
            }

            state.removeNetwork(this.network.id);
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
    margin: 0 auto;
    max-width: 400px;
}
.kiwi-networksettings-close {
    float: right;
}
.kiwi-networksettings-section {
    margin: 0 10px 40px 10px;
}
.kiwi-networksettings form .input-text {
    margin-bottom: 10px;
}

.kiwi-networksettings-error {
    text-align: center;
    margin: 1em;
    padding: 0.3em;
}
.kiwi-networksettings-error span {
    display: block;
    font-style: italic;
}
.kiwi-networksettings-server-types {
    margin-top: 1em;
    text-align: center;
}
.kiwi-networksettings-server-types a {
    margin-right: 1em;
}
.kiwi-networksettings-server-types-info {
    font-size: 0.9em;
    font-style: italic;
}
.kiwi-networksettings-server-type-active {
    font-weight: bold;
}
.kiwi-networksettings-connection-address {
    width: 70%;
    display: inline-block;
}
.kiwi-networksettings-connection-port {
    width: 25%;
    float: right;
}

.kiwi-networksettings-connection-password {
    width: 70%;
}

.kiwi-networksettings-user {
    width: 70%;
}
.kiwi-networksettings-danger h3 {
    padding: 5px 10px;
    margin-top: 70px;
    margin-bottom: 1em;
}
</style>
