<template>
    <div class="kiwi-statebrowser">
        <div
            v-if="bufferForPopup"
            class="kiwi-statebrowser-channel-popup"
            v-bind:style="{
                top: popup_top + 'px'
            }"
            @click.stop=""
        >
            <buffer-settings v-bind:buffer="bufferForPopup"></buffer-settings>
            <a @click="closeBuffer" class="u-link">{{$t('state_leave', {name: bufferForPopup.name})}}</a>
        </div>

        <div
            v-if="isPersistingState"
            class="kiwi-statebrowser-usermenu"
            :class="[is_usermenu_open?'kiwi-statebrowser-usermenu--open':'']"
        >
            <a class="kiwi-statebrowser-usermenu-header" @click="is_usermenu_open=!is_usermenu_open">{{$t('state_account')}} <i class="fa fa-caret-down"></i></a>
            <div v-if="is_usermenu_open" class="kiwi-statebrowser-usermenu-body">
                {{$t('state_remembered')}}<br />
                <a class="u-link" @click="clickForget">{{$t('state_forget')}}</i></a> <br />
                <br />
                <button class="u-button u-button-primary" @click="is_usermenu_open=false">{{$t('close')}}</button>
            </div>

            <div class="kiwi-statebrowser-divider"></div>
        </div>

        <div class="kiwi-statebrowser-switcher">
            <a@click="clickAddNetwork" v-if="!isRestrictedServer" ><i class="fa fa-plus" aria-hidden="true"></i></a><a @click="clickAppSettings" ><i class="fa fa-cog" aria-hidden="true"></i></a>
        </div>

        <div v-if="networks.length === 0" class="kiwi-statebrowser-nonetworks">
            {{$t('state_network')}}<br><a class="u-link" @click="clickAddNetwork">{{$t('state_add')}}</a>
        </div>

        <div v-if="Object.keys(provided_networks).length > 0" class="kiwi-statebrowser-availablenetworks">
            <div @click="show_provided_networks=!show_provided_networks" class="kiwi-statebrowser-availablenetworks-toggle">&#8618; {{$t('state_available')}}</div>
            <div
                class="kiwi-statebrowser-availablenetworks-networks"
                :class="{'kiwi-statebrowser-availablenetworks-networks--open': show_provided_networks}"
            >
                <div
                    v-for="(pNets, pNetTypeName) in provided_networks"
                    class="kiwi-statebrowser-availablenetworks-type"
                >
                    <div class="kiwi-statebrowser-availablenetworks-name">{{pNetTypeName}}</div>
                    <div v-for="pNet in pNets" class="kiwi-statebrowser-availablenetworks-link" :class="[pNet.connected?'kiwi-statebrowser-availablenetworks-link--connected':'']">
                        <a @click="connectProvidedNetwork(pNet)">{{pNet.name}}</a><br/>
                    </div>
                </div>
            </div>
        </div>

        <div class="kiwi-statebrowser-scrollarea">
            <div class="kiwi-statebrowser-networks">
                <state-browser-network
                    v-for="network in networksToShow"
                    :network="network"
                    @showBufferSettings="showBufferPopup"
                ></state-browser-network>
            </div>
        </div>
    </div>
</template>

<script>

import state from 'src/libs/state';
import StateBrowserNetwork from './StateBrowserNetwork';
import AppSettings from './AppSettings';
import BufferSettings from './BufferSettings';
import NetworkProvider from 'src/libs/NetworkProvider';
import NetworkProviderZnc from 'src/libs/networkproviders/NetworkProviderZnc';

let netProv = new NetworkProvider();

let znc = new NetworkProviderZnc(state);
netProv.addProvider(znc);
znc.autoDetectZncNetworks();

export default {
    data: function data() {
        return {
            // Name of the buffer that should show its popup
            popup_buffername: null,
            popup_networkid: null,
            popup_top: 0,
            new_channel_input: '',
            is_usermenu_open: false,
            show_provided_networks: false,
            provided_networks: Object.create(null),
        };
    },
    props: ['networks'],
    components: {
        BufferSettings,
        StateBrowserNetwork,
    },
    methods: {
        showBufferPopup: function showBufferPopup(buffer, domY) {
            if (!buffer) {
                this.popup_buffername = null;
                this.popup_networkid = null;
                this.popup_top = 0;
            } else {
                this.popup_buffername = buffer.name;
                this.popup_networkid = buffer.networkid;
                this.popup_top = domY;
            }
        },
        closeBuffer: function closeBuffer() {
            state.removeBuffer(this.bufferForPopup);
        },
        onNewChannelInputFocus: function onNewChannelInputFocus() {
            // Auto insert the # if no value is already in. Easier for mobile users
            if (!this.new_channel_input) {
                this.new_channel_input = '#';
            }
        },
        onNewChannelInputBlur: function onNewChannelInputBlur() {
            // Remove the # since we may have auto inserted it as they tabbed past
            if (this.new_channel_input === '#') {
                this.new_channel_input = '';
            }
        },
        clickAddNetwork: function clickAddNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork('Network', nick, {});
            state.$emit('network.settings', network);
        },
        clickAppSettings: function clickAppSettings() {
            state.$emit('active.component', AppSettings);
        },
        clickForget: function clickForget() {
            let msg = 'This will delete all stored networks and start fresh. Are you sure?';
            let confirmed = confirm(msg);
            if (!confirmed) {
                return;
            }

            state.persistence.forgetState();
            window.location.reload();
        },
        connectProvidedNetwork: function connectProvidedNetwork(pNet) {
            let net = state.addNetwork(pNet.name, pNet.nick, {
                server: pNet.server,
                port: pNet.port,
                tls: pNet.tls,
                password: pNet.password,
            });

            net.ircClient.connect();
        },
    },
    computed: {
        bufferForPopup: function bufferForPopup() {
            if (!this.popup_buffername || !this.popup_networkid) {
                return false;
            }

            return state.getBufferByName(this.popup_networkid, this.popup_buffername);
        },
        isPersistingState: function isPersistingState() {
            return !!state.persistence;
        },
        isRestrictedServer: function isRestrictedServer() {
            return !!state.settings.restricted;
        },
        networksToShow: function networksToShow() {
            let bncNet = state.setting('bnc').network;
            return this.networks.filter(network => network !== bncNet);
        },
    },
    created: function created() {
        this.listen(state, 'document.clicked', () => {
            this.showBufferPopup(null);
        });

        netProv.on('networks', networks => {
            this.provided_networks = networks;
        });
    },
};
</script>

<style>
.kiwi-statebrowser {
    box-sizing: border-box;
    z-index: 3; /* Must be at leats 1 higher than the workspace :after z-index; */
    display: flex;
    flex-direction: column;
}

.kiwi-statebrowser-usermenu-header {
    cursor: pointer;
}

.kiwi-statebrowser-switcher {
    text-align: center;
}
.kiwi-statebrowser-switcher a {
    display: inline-block;
    width: 50%;
}

.kiwi-statebrowser-scrollarea {
    overflow: auto;
    width: 100%;
    flex: 1;
}
.kiwi-statebrowser-networks {
}
.kiwi-statebrowser-channel {
    position: relative;
    display: flex;
}
.kiwi-statebrowser-channel-name {
    flex: 1;
}

.kiwi-statebrowser-channel-settings {
    display: none;
}
.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-settings {
    display: inline-block;
}
.kiwi-statebrowser-channel-popup {
    display: block;
    position: absolute;
    left: 100%;
    width: 100%;
}

.kiwi-statebrowser-options {
    position: absolute;
    bottom: 0;
    padding: 15px;
    height: 30px;
}


.kiwi-statebrowser-availablenetworks-toggle {
    cursor: pointer;
    text-align: center;
}
.kiwi-statebrowser-availablenetworks-networks {
    overflow: hidden;
    max-height: 0px;
    transition: max-height 0.5s;
}
.kiwi-statebrowser-availablenetworks-networks--open {
    max-height: 500px;
}
.kiwi-statebrowser-availablenetworks-link a {
    cursor: pointer;
}
</style>
