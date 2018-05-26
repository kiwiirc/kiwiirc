<template>
    <div class="kiwi-networksettings">
        <form class="u-form">
            <div class="kiwi-networksettings-section kiwi-networksettings-connection">

                <div class='kiwi-title'>{{$t('settings_server_details')}}</div>
                <div class="kiwi-padded-form-element-container">
                    <div class="kiwi-networksettings-error" v-if="network.state_error">We couldn't connect to that server :( <span>{{readableStateError(network.state_error)}}</span></div>

                    <input-text :label="$t('server')" v-focus v-model="network.connection.server" class="kiwi-networksettings-connection-address"/>

                    <input-text :label="$t('settings_port')" v-model="network.connection.port" type="number" class="kiwi-networksettings-connection-port">
                        <span class="fa-stack fa-lg kiwi-customserver-tls" :class="[network.connection.tls ? 'kiwi-customserver-tls--enabled' : '']" @click="toggleTls">
                            <i class="fa fa-lock fa-stack-1x kiwi-customserver-tls-lock"></i>
                            <i v-if="!network.connection.tls" class="fa fa-unlock fa-stack-1x kiwi-customserver-tls-minus"></i>
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

                    <div class="kiwi-padded-form-element-container">
                        <div class="kiwi-networksettings-server-types">
                            <div v-if="server_type==='znc'" class="kiwi-networksettings-server-types-info">
                                {{$t('settings_znc_other')}}
                            </div>
                            <a
                                @click="server_type='network'"
                                class="u-link kiwi-network-type-button"
                                :class="{'kiwi-networksettings-server-type-active': server_type==='network'}"
                            >{{$t('network')}}</a>
                            <a
                                @click="server_type='znc'"
                                class="u-link kiwi-network-type-button"
                                :class="{'kiwi-networksettings-server-type-active': server_type==='znc'}"
                            >{{$t('znc')}}</a>
                        </div>
                    </div>

                    <div class="kiwi-networksettings-section  kiwi-networksettings-user kiwi-networksettings-username">
                        <input-text v-model="network.nick" :label="$t('settings_nickname')" />
                    </div>

                    <h4 @click="show_advanced=!show_advanced" class="kiwi-show-advanced-title">{{$t('settings_advanced')}} <i class="fa" :class="['fa-caret-'+(show_advanced?'up':'down')]" aria-hidden="true"></i></h4>
                    <div class="kiwi-networksettings-advanced-container">
                        <div class="kiwi-networksettings-section  kiwi-networksettings-user">
                            <div class="kiwi-networksettings-section kiwi-networksettings-advanced">
                                <template v-if="show_advanced">
                                    <input-text :label="$t('settings_encoding')" v-model="network.connection.encoding" />
                                    <label><span class="kiwi-appsettings-showraw-label">{{$t('settings_show_raw')}} </span> <input v-model="settingShowRaw" type="checkbox" /></label><br />
                                    <label class="u-form-block">
                                        <span>{{$t('settings_autorun')}}</span>
                                        <textarea v-model="network.auto_commands" cols=40 rows=5></textarea>
                                    </label>
                                </template>
                            </div>
                        </div>
                    </div>

                    <div class="kiwi-padded-form-element-container">
                        <div v-if="network.state === 'disconnected'" class="u-button kiwi-connect-to-newnetwork" @click="network.ircClient.connect()">
                            Connect To Network
                        </div>
                        <div v-else-if="network.state === 'connecting'" class="u-button kiwi-connect-to-newnetwork" >
                            {{$t('connecting')}}
                        </div>
                    </div>
                </div>

                <div class="kiwi-padded-form-element-container kiwi-dangerzone">
                    <div class="kiwi-networksettings-section kiwi-networksettings-danger">
                        <h3>{{$t('settings_danger')}}</h3>
                        <a class="u-button u-button-warning" @click="removeNetwork">
                            <i class="fa fa-times" aria-hidden="true"></i> {{$t('settings_remove')}}
                        </a>
                    </div>
                </div>
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
};
</script>

<style lang="less">

.kiwi-networksettings {
    box-sizing: border-box;
    height: 100%;
    margin: 0 auto;
    padding: 0;
}

.kiwi-networksettings .kiwi-title {
    float: left;
    width: 100%;
    line-height: 45px;
    height: 46px;
    padding: 0 10px;
    box-sizing: border-box;
    text-align: left;
    font-weight: 600;
    cursor: default;
}

.kiwi-networksettings span {
    text-align: center;
    width: 46px;
    line-height: 46px;
    margin: 0 5px 0 -10px;
    font-weight: 600;
    font-size: 1.2em;
}

.kiwi-networksettings .u-form {
    max-width: 400px;
    display: block;
    margin: 1em auto;
    padding: 0;
    height: auto;
    overflow: hidden;
    clear: both;
    border-radius: 2px;
}

.kiwi-networksettings .u-form span {
    display: inline-block;
    line-height: 25px;
    width: auto;
    font-weight: 500;
    font-size: 1em;
    text-align: left;
    max-width: none;
    top: 10px;
}

.kiwi-networksettings .u-form .input-text--reveal-value span {
    top: -14px;
    font-size: 1em;
    font-size: 0.8em;
}

.kiwi-networksettings input[type='text'],
    .kiwi-networksettings input[type='password'],
    .kiwi-networksettings input[type='email'],
    .kiwi-networksettings textarea,
    .kiwi-networksettings .input-text input {
    clear: both;
    width: 100%;
    height: 40px;
    padding: 0 10px;
    line-height: 40px;
    color: #000;
    box-sizing: border-box;
    background: #fff;
    border-radius: 1px;
    min-height: none;
    overflow-x: hidden;
    overflow-y: auto;
    max-width: none;
}

.kiwi-networksettings .input-text-c {
    bottom: auto;
    height: 40px;
    background-color: #fff;
    line-height: 40px;
    text-align: center;
    top: 8px;
}

.kiwi-networksettings .kiwi-show-advanced-title {
    width: 100%;
    text-align: center;
    cursor: pointer;
    margin-bottom: -10px;
}

.kiwi-networksettings .kiwi-networksettings-advanced {
    margin-top: 10px;
}

.kiwi-networksettings .kiwi-networksettings-advanced .kiwi-appsettings-showraw-label {
    margin-left: 5px;
}

.kiwi-networksettings .kiwi-padded-form-element-container {
    float: left;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
}

.kiwi-networksettings .kiwi-padded-form-element-container label {
    margin: 0;
}

.kiwi-networksettings .kiwi-padded-form-element-container .input-text {
    padding-top: 0;
}

.kiwi-networksettings .kiwi-padded-form-element-container.kiwi-dangerzone {
    text-align: center;
}

.kiwi-networksettings-advanced-container {
    padding: 20px 0;
}

.kiwi-networksettings-advanced-container span {
    margin-left: 0;
}

.kiwi-networksettings-advanced-container .u-form-block label {
    float: left;
}

.kiwi-networksettings .input-text .input-text-label {
    margin-left: -5px;
}

.kiwi-networksettings .kiwi-networksettings-connection-password {
    float: left;
    width: 100%;
}

.kiwi-networksettings .kiwi-networksettings-connection-password .input-text {
    float: left;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-networksettings .kiwi-networksettings-server-types-info {
    float: left;
    width: 100%;
    text-align: left;
    clear: both;
}

.kiwi-networksettings .kiwi-networksettings-server-types {
    text-align: center;
}

.kiwi-networksettings .kiwi-networksettings-server-types .kiwi-network-type-button {
    margin: 0 10px 0 10px;
    display: inline-block;
    line-height: 35px;
    padding: 0 10px;
    border: 1px solid;
    transition: all 0.3s;
    border-radius: 4px;
}

.kiwi-networksettings .kiwi-networksettings-username label {
    display: none;
}

.kiwi-networksettings .kiwi-customserver-tls {
    cursor: pointer;
    top: 6px;
}

.kiwi-networksettings .kiwi-customserver-tls-lock {
    font-size: 1.4em;
    opacity: 0;
    left: 3px;
}

.kiwi-networksettings .kiwi-customserver-tls--enabled .kiwi-customserver-tls-lock {
    opacity: 1;
}

.kiwi-networksettings .kiwi-customserver-tls-minus {
    font-size: 1.4em;
    top: 0;
    left: 3px;
}

.kiwi-networksettings .kiwi-connect-to-newnetwork {
    width: auto;
    margin: -10px auto 0 auto;
    border-radius: 3px;
    display: block;
    cursor: pointer;
    padding: 0 10px;
    line-height: 35px;
}

.kiwi-networksettings .kiwi-connect-to-newnetwork:hover {
    opacity: 1;
}

.kiwi-networksettings-section {
    float: left;
    box-sizing: border-box;
    width: 100%;
}

.kiwi-networksettings-close {
    float: right;
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

.kiwi-networksettings-server-types a {
    margin-right: 1em;
}

.kiwi-networksettings-server-types-info {
    font-size: 0.9em;
    font-style: italic;
}

.kiwi-networksettings-connection-address {
    width: 70%;
    display: inline-block;
}

.kiwi-networksettings-connection-port {
    width: 25%;
    float: right;
}

.kiwi-networksettings-connection-port span.input-text-label {
    top: -16px;
}

.kiwi-networksettings-advanced h3 {
    transition: all 0.3s;
}

.kiwi-networksettings-advanced h3:hover {
    cursor: pointer;
}

.kiwi-networksettings-danger h3 {
    padding: 0;
    margin-top: 10px;
    margin-bottom: 0.5em;
}

.kiwi-networksettings-danger label {
    float: left;
    margin: 0;
    width: 100%;
}

.kiwi-networksettings-danger .u-button-warning {
    width: auto;
    height: 30px;
    border-radius: 4px;
    text-align: center;
    line-height: 30px;
    padding: 0 10px;
    opacity: 0.8;
    margin: 0 auto;
    transition: all 0.3s;
}

.kiwi-networksettings-danger .u-button-warning:hover {
    opacity: 1;
}

@media screen and (max-width: 769px) {
    .kiwi-networksettings {
        z-index: 100;
    }
}
</style>
