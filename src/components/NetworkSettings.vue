<template>
    <div class="kiwi-networksettings">
        <form class="u-form" @submit.prevent="connect">
            <div class="kiwi-title">{{ $t('settings_server_details') }}</div>
            <div class="kiwi-networksettings-section-block">
                <div v-if="network.state_error" class="kiwi-networksettings-error">
                    {{ $t('network_noconnect') }}
                    <span>{{ readableStateError(network.state_error) }}</span>
                </div>
                <div v-else-if="network.last_error" class="kiwi-networksettings-error">
                    {{ $t('network_noconnect') }}
                    <span>{{ network.last_error }}</span>
                </div>

                <server-selector
                    :connection="network.connection"
                    :network-list="network_list"
                />

                <div class="kiwi-networksettings-connection-password">
                    <template v-if="server_type==='network'">
                        <input-text
                            v-model="network.connection.nick"
                            :label="$t('settings_nickname')"
                        />
                        <input-text
                            :show-plain-text="true"
                            :label="$t('password')"
                            v-model="network.password"
                            type="password"
                        />
                    </template>
                    <template v-else>
                        <input-text :label="$t('username')" v-model="znc_username" />
                        <input-text :label="$t('network')" v-model="znc_network" />
                        <input-text
                            :label="$t('password')"
                            v-model="znc_password"
                            type="password"
                        />
                    </template>
                </div>

                <div class="kiwi-networksettings-server-types">
                    <div
                        v-if="server_type==='znc'"
                        class="kiwi-networksettings-server-types-info"
                    >
                        {{ $t('settings_znc_other') }}
                    </div>
                    <a
                        :class="{
                            'kiwi-networksettings-server-type-active':
                                server_type==='network'
                        }"
                        class="u-link kiwi-network-type-button"
                        @click="server_type='network'"
                    >
                        {{ $t('network') }}
                    </a>
                    <a
                        :class="{
                            'kiwi-networksettings-server-type-active': server_type==='znc'
                        }"
                        class="u-link kiwi-network-type-button"
                        @click="server_type='znc'"
                    >
                        {{ $t('znc') }}
                    </a>
                </div>

                <h4
                    class="kiwi-show-advanced-title"
                    @click="show_advanced=!show_advanced"
                >
                    {{ $t('settings_advanced') }}
                    <i
                        :class="['fa-caret-'+(show_advanced?'up':'down')]"
                        class="fa"
                        aria-hidden="true"
                    />
                </h4>

                <div v-if="show_advanced" class="kiwi-networksettings-advanced">
                    <template>
                        <input-text
                            :label="$t('settings_encoding')"
                            v-model="network.connection.encoding"
                        />

                        <input-text
                            :show-plain-text="true"
                            :label="$t('server_password')"
                            v-model="network.connection.password"
                            type="password"
                        />

                        <label>
                            <span class="kiwi-appsettings-showraw-label">
                                {{ $t('settings_show_raw') }}
                            </span>
                            <input v-model="settingShowRaw" type="checkbox" >
                        </label>

                        <label>
                            <span class="kiwi-appsettings-showraw-label">
                                {{ $t('settings_use_websocket') }}
                            </span>
                            <input v-model="network.connection.direct" type="checkbox" >
                            <input-text
                                v-if="network.connection.direct"
                                v-model="directWs"
                            />
                        </label>

                        <label class="u-form-block">
                            <input-text
                                :label="$t('settings_autorun')"
                                v-model="network.auto_commands"
                                type="textarea"
                            />
                        </label>
                    </template>
                </div>

                <button
                    v-if="network.state === 'disconnected'"
                    class="u-button kiwi-connect-to-newnetwork"
                    @click="connect()"
                >
                    {{ $t('network_connect') }}
                </button>
                <button
                    v-else-if="network.state === 'connecting'"
                    class="u-button kiwi-connect-to-newnetwork"
                    disabled
                >
                    {{ $t('connecting') }}
                </button>
            </div>

            <div class="kiwi-dangerzone">
                <h3>{{ $t('settings_danger') }}</h3>
                <a class="u-button u-button-warning" @click="removeNetwork">
                    <i class="fa fa-times" aria-hidden="true"/> {{ $t('settings_remove') }}
                </a>
            </div>
        </form>
    </div>
</template>

<script>
'kiwi public';

import * as Misc from '@/helpers/Misc';
import ServerSelector from './ServerSelector';

export default {
    components: {
        ServerSelector,
    },
    props: ['network'],
    data() {
        return {
            server_type: 'network',
            znc_username: '',
            znc_network: '',
            znc_password: '',
            show_advanced: false,
            switch_tabs_on_connect: false,
            network_list: [],
        };
    },
    computed: {
        settingShowRaw: {
            get() {
                return this.network.setting('show_raw');
            },
            set(val) {
                return this.network.setting('show_raw', val);
            },
        },
        directWs: {
            get() {
                if (!this.network.connection.direct) {
                    return '';
                }

                let connection = this.network.connection;
                let addr = '';
                addr += connection.tls ?
                    'wss://' :
                    'ws://';
                addr += connection.server;

                let port = parseInt(connection.port, 10);
                if (Number.isNaN(port)) {
                    port = connection.tls ?
                        443 :
                        80;
                }

                // Only include the port if needed
                if (
                    (connection.tls && port !== 443) ||
                    (!connection.tls && port !== 80)
                ) {
                    addr += ':' + connection.port;
                }

                addr += connection.path;

                return addr;
            },
            set(newVal) {
                let url = null;

                try {
                    url = new URL(newVal);
                } catch (e) {
                    return;
                }

                let connection = this.network.connection;
                connection.tls = url.protocol.toLowerCase() === 'wss:';
                connection.server = url.hostname;

                let port = parseInt(url.port, 10);
                if (Number.isNaN(port)) {
                    port = url.protocol.toLowerCase() === 'wss:' ?
                        433 :
                        80;
                }

                connection.port = port;
                let u = url.href.replace(url.protocol + '//', '');
                connection.path = u.substr(u.indexOf('/'));
            },
        },
    },
    watch: {
        znc_username() {
            this.setZncPass();
        },
        znc_network() {
            this.setZncPass();
        },
        znc_password() {
            this.setZncPass();
        },
        'network.state'() {
            if (!this.switch_tabs_on_connect) {
                return;
            }

            if (this.network.state === 'connected') {
                this.switch_tabs_on_connect = false;
                this.$state.$emit('server.tab.show', 'messages');
            } else if (this.network.state_error) {
                this.switch_tabs_on_connect = false;
            }
        },
    },
    created() {
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

        this.network_list = this.$state.setting('presetNetworks') || [];
    },
    methods: {
        readableStateError(err) {
            return Misc.networkErrorMessage(err);
        },
        connect() {
            this.switch_tabs_on_connect = true;
            this.network.ircClient.connect();
        },
        reconnect() {
            this.network.ircClient.connect();
        },
        removeNetwork() {
            /* eslint-disable no-restricted-globals, no-alert */
            let confirmed = confirm('Really remove this network? This cannot be undone!');
            if (!confirmed) {
                return;
            }

            this.$state.removeNetwork(this.network.id);
            this.$state.$emit('active.component');
        },
        setZncPass() {
            let newPass = `${this.znc_username}/${this.znc_network}:${this.znc_password}`;
            this.network.connection.password = newPass;
            this.network.connection.nick = this.znc_username;
        },
        toggleTls() {
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
    width: 100%;
    line-height: 45px;
    height: 46px;
    padding: 0 10px;
    box-sizing: border-box;
    text-align: left;
    font-weight: 600;
    cursor: default;
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
    border: 1px solid;
}

.kiwi-networksettings .u-input-text {
    padding-top: 0;
    margin-bottom: 20px;
}

//The 'Sections' of the form
.kiwi-networksettings-section-block {
    box-sizing: border-box;
    width: 100%;
    padding: 20px;
}

//Style the 'secrue/unsecure' port icon
.kiwi-networksettings .kiwi-customserver-tls {
    text-align: center;
    cursor: pointer;
    font-size: 1em;
}

.kiwi-networksettings .kiwi-customserver-tls i {
    left: 3px;
    top: 2px;
    font-size: 1.3em;
}

//Style the network types section
.kiwi-networksettings .kiwi-networksettings-server-types-info {
    width: 100%;
    text-align: left;
    margin-bottom: 10px;
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

.kiwi-networksettings .kiwi-show-advanced-title {
    text-align: center;
    cursor: pointer;
    padding-top: 0;
    margin: 40px 0 20px 0;
}

//Apply spacing to the advanced options checkbox label
.kiwi-networksettings .kiwi-networksettings-advanced .kiwi-appsettings-showraw-label {
    margin-left: 5px;
}

//Large connection button
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

.kiwi-networksettings-advanced {
    margin-bottom: 20px;
}

//Danger zone - bottom section
.kiwi-dangerzone {
    text-align: center;
    padding: 10px 0 20px 0;
    border-top: 1px solid rgba(0, 0, 0, 0.2);
}

.kiwi-dangerzone i {
    margin-right: 5px;
}

.kiwi-dangerzone h3 {
    padding-top: 0;
}

.kiwi-networksettings-error {
    text-align: center;
    margin: 1em;
    padding: 0.3em;
    border: 1px solid;
}

.kiwi-networksettings .kiwi-networksettings-error span {
    display: block;
    font-style: italic;
    text-align: center;
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

.kiwi-networksettings-danger h3 {
    padding: 0;
    margin-top: 0;
    margin-bottom: 0.5em;
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
