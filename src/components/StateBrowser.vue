<template>
    <div class="kiwi-statebrowser">
        <div class="kiwi-statebrowser-tools">
            <div v-for="el in pluginUiElements" v-rawElement="el" class="kiwi-statebrowser-tool"></div>
        </div>

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
                <p> {{$t('state_remembered')}} </p>
                <a @click="clickForget">{{$t('state_forget')}}</a>
                <div class="close-icon" @click="is_usermenu_open=false">
                  <i class="fa fa-times" aria-hidden="true"></i>
                </div>
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
                    :key="network.id"
                    :network="network"
                    @showBufferSettings="showBufferPopup"
                ></state-browser-network>
            </div>
        </div>
    </div>
</template>

<script>

import state from '@/libs/state';
import StateBrowserNetwork from './StateBrowserNetwork';
import AppSettings from './AppSettings';
import BufferSettings from './BufferSettings';
import NetworkProvider from '@/libs/NetworkProvider';
import NetworkProviderZnc from '@/libs/networkproviders/NetworkProviderZnc';
import GlobalApi from '@/libs/GlobalApi';

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
            pluginUiElements: GlobalApi.singleton().stateBrowserPlugins,
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
                let stateBrowserTopPosition = this.$el.getBoundingClientRect();
                this.popup_buffername = buffer.name;
                this.popup_networkid = buffer.networkid;
                this.popup_top = domY - stateBrowserTopPosition.top;
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
            /* eslint-disable no-restricted-globals */
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
    z-index: 11; /* Must be at least 1 higher than the workspace :after z-index; */
    display: flex;
    flex-direction: column;
    border-right: 5px solid rgba(255,255,255,0.3);
}


.kiwi-statebrowser-usermenu--open .fa-caret-down{
    transform: rotate(-180deg);
}

.kiwi-statebrowser-usermenu-header {
    display: block;
    cursor: pointer;
    font-size: 0.8em;
    padding: 1.4em 1em 1em 1em;
    width: 100%;
    letter-spacing: 0.2em;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(255,255,255,0.3);
}
.kiwi-statebrowser-usermenu-header i{
    float: right;
    line-height: 1.2em;
    display: block;
    font-size: 16px;
}

.kiwi-statebrowser-divider{
    display:none;
}

.kiwi-statebrowser-usermenu-body {
    font-size: 0.9em;
    position: relative;
    margin: 0 0 1em 0;
    padding: 2.5em 0 1em 0;
    border-bottom: 1px solid rgba(255,255,255,0.3);
}

.kiwi-statebrowser-usermenu-body p{
    padding: 0 1em 1em 1em;
    margin: 0;
}

.kiwi-statebrowser-usermenu-body a{
  cursor: pointer;
}
.kiwi-statebrowser-usermenu-body a:hover{
  text-decoration: underline;
}

.kiwi-statebrowser-usermenu-body .close-icon{
    position: absolute;
    right:0em;
    top:0em;
    cursor: pointer;
    transition: all 0.1s;
    padding: 0.2em 0.4em;
    border-radius:0 0 0 0.4em;
    background-color:#fc6262;
    color:#ffffff;
}
.kiwi-statebrowser-usermenu-body .close-icon:hover{
    text-decoration: underline;
    opacity: 1;
}

.kiwi-statebrowser-usermenu-body a{
    width: 100%;
    display:block;
    margin: 0 auto;
    text-align:center;
    color: #42b983;
    text-decoration:underline;
    border: none;
}

.kiwi-statebrowser-switcher a {
    display: inline-block;
    width: 50%;
    padding: 5px 0;
    font-size: 1.2em;
    cursor: pointer;
    text-align: center;
}
.kiwi-statebrowser-switcher a:first-of-type {
    background: rgba(255,255,255,0.15);
}
.kiwi-statebrowser-switcher a:hover {
    background: rgba(255,255,255,0.1);
}

.kiwi-statebrowser-scrollarea {
    overflow: auto;
    width: 100%;
    flex: 1;
}
.kiwi-statebrowser-network {
    margin-bottom: 2em;
    overflow: hidden;
}
.kiwi-statebrowser-network:last-child {
    margin-bottom: 0px;
}

.kiwi-statebrowser-options {
    position: absolute;
    bottom: 0;
    padding: 15px;
    height: 30px;
    /* some space on the right so it doesnt overlap the parent elements scrollbar */
    margin-right: 10px;
}

.kiwi-statebrowser-nonetworks {
    background: rgba(255,255,255,0.15);
    padding: 5px;
    text-align: center;
}

.kiwi-statebrowser-availablenetworks-toggle {
    cursor: pointer;
    text-align: center;
    padding: 5px 0;
}
.kiwi-statebrowser-availablenetworks-type {
    padding: 10px;
}
.kiwi-statebrowser-availablenetworks-name {
    text-align: center;
    font-weight: bold;
    text-transform: capitalize;
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

.kiwi-statebrowser-newchannel {
    margin: 1em 0.5em;
}
.kiwi-statebrowser-newchannel-inputwrap {
    padding: 3px;
}
.kiwi-statebrowser-newchannel-inputwrap--focus {
}
.kiwi-statebrowser-newchannel-inputwrap input {
    outline: none;
    border: none;
    display: block;
    /* left: 0; */
    /* right: 10px; */
    width: calc(100% - 20px);
    margin-right: 30px;
}
.kiwi-statebrowser-newchannel-inputwrap i {
    position: absolute;
    right: 5px;
    top: 5px;
    cursor: pointer;
}

@media screen and (max-width: 600px){
  .kiwi-container-toggledraw-statebrowser-messagecount{
      width: 30px;
      color: #000;
      font-weight: 600;
  }
}

</style>
