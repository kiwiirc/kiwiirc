<template>
    <div class="kiwi-statebrowser">

        <div class="kiwi-statebrowser-mobile-close" @click="hideStatebrowser">
            <span> Close </span>
            <i class="fa fa-times" aria-hidden="true"></i>
        </div>

        <div
            v-if="isPersistingState"
            class="kiwi-statebrowser-usermenu"
            :class="[is_usermenu_open?'kiwi-statebrowser-usermenu--open':'']"
        >
            <div class="kiwi-statebrowser-usermenu-avatar" @click="is_usermenu_open=!is_usermenu_open">
                U
            </div>
            <div v-if="is_usermenu_open" class="kiwi-statebrowser-usermenu-body">
                <p> {{$t('state_remembered')}} </p>
                <a @click="clickForget" class="u-link">{{$t('state_forget')}}</a>
                <div class="close-icon" @click="is_usermenu_open=false">
                  <i class="fa fa-times" aria-hidden="true"></i>
                </div>
            </div>
        </div>

        <div class="kiwi-statebrowser-appsettings" @click="clickAppSettings">
            Kiwi Settings <i class="fa fa-cog" aria-hidden="true"></i>
        </div>

        <div class="kiwi-statebrowser-tools">
            <div v-for="el in pluginUiElements" v-rawElement="el" class="kiwi-statebrowser-tool"></div>
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
                    :uiState="uiState"
                ></state-browser-network>
            </div>
        </div>

        <div v-if="!isRestrictedServer" class="kiwi-statebrowser-newnetwork">
            <a @click="clickAddNetwork" class="u-button u-button-primary">Add Network<i class="fa fa-plus" aria-hidden="true"></i></a>
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
            is_usermenu_open: false,
            show_provided_networks: false,
            provided_networks: Object.create(null),
            pluginUiElements: GlobalApi.singleton().stateBrowserPlugins,
        };
    },
    props: ['networks', 'uiState'],
    components: {
        BufferSettings,
        StateBrowserNetwork,
    },
    methods: {
        clickAddNetwork: function clickAddNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.getNetworkFromAddress('');
            if (typeof network === 'undefined') {
                network = state.addNetwork('Network', nick, {});
            }
            network.showServerBuffer('settings');
        },
        clickAppSettings: function clickAppSettings() {
            state.$emit('active.component', AppSettings);
        },
        hideStatebrowser: function hideStatebrowser() {
            state.$emit('statebrowser.hide');
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
        isConnected: function isConnected() {
            return state.getActiveNetwork().state === 'connected';
        },
    },
    created: function created() {
        netProv.on('networks', networks => {
            this.provided_networks = networks;
        });
    },
};
</script>

<style lang="less">

.kiwi-statebrowser {
    box-sizing: border-box;
    z-index: 11; /* Must be at least 1 higher than the workspace :after z-index; */
    display: flex;
    flex-direction: column;
    border-right: none;
    width: 220px;
    text-align: center;
    overflow: hidden;
}

.kiwi-statebrowser h1 {
    width: 100%;
    font-size: 1em;
    opacity: 0.8;
    cursor: default;
    padding: 20px 0 27px 0;
}

.kiwi-statebrowser hr {
    width: 100%;
    margin: 0;
    opacity: 0.3;
}

/* User Settings */
.kiwi-statebrowser-appsettings {
    width: 90%;
    text-align: left;
    padding: 0 10px 0 10px;
    font-size: 0.8em;
    border-radius: 4px;
    box-sizing: border-box;
    opacity: 1;
    line-height: 35px;
    cursor: pointer;
    margin: 0 5%;
    font-weight: 500;
    letter-spacing: 1px;
    transition: all 0.3s;
    margin-bottom: 10px;
}

.kiwi-statebrowser-appsettings:hover {
    opacity: 1;
}

.kiwi-statebrowser-appsettings span {
    font-weight: 600;
}

.kiwi-statebrowser-appsettings i {
    float: right;
    line-height: 35px;
    font-size: 1.2em;
}

.kiwi-statebrowser-usermenu {
    width: 100%;
    padding-bottom: 0;
    margin-bottom: 10px;
    padding-top: 10px;
}

.kiwi-statebrowser-usermenu-avatar {
    width: 50px;
    height: 50px;
    cursor: pointer;
    font-size: 1.5em;
    text-align: center;
    line-height: 50px;
    border-radius: 50%;
    overflow: hidden;
    margin: 0 auto 10px auto;
    transition: all 0.3s;
}

.kiwi-statebrowser-usermenu-body {
    width: 100%;
    box-sizing: border-box;
    padding: 0 10px;
    font-size: 0.8em;
    margin-bottom: 10px;
}

.kiwi-statebrowser-usermenu-body p {
    margin-bottom: 0;
}

/* Add network button */
.kiwi-statebrowser-newnetwork {
    width: 100%;
    position: static;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
}

.kiwi-statebrowser-newnetwork a {
    width: 100%;
    padding: 0 10px;
    margin: 0;
    opacity: 1;
    line-height: 39px;
    cursor: pointer;
    display: block;
    box-sizing: border-box;
    background: none;
    text-align: left;
    position: relative;
    border-radius: 0;
    font-size: 0.9em;
    transition: all 0.3s;
    border: none;
}

.kiwi-statebrowser-newnetwork a i {
    position: absolute;
    right: 10px;
    line-height: 39px;
    font-size: 1.15em;
}

.kiwi-statebrowser-newnetwork a:hover {
    opacity: 1;
}

.kiwi-statebrowser-network .kiwi-statebrowser-network-header {
    float: left;
    width: 100%;
    line-height: 45px;
    text-align: left;
    position: relative;
}

.kiwi-statebrowser-network .kiwi-statebrowser-network-header a {
    text-align: left;
    padding: 0 0 0 10px;
    width: 100%;
    font-size: 1em;
    font-weight: 600;
}

/* Channel Styling */
.kiwi-statebrowser-channel {
    line-height: 30px;
    padding: 0 0 0 8px;
    transition: opacity 0.3s;
}

.kiwi-statebrowser-channel .kiwi-statebrowser-channel-name {
    text-align: left;
    font-weight: 600;
    font-size: 1em;
}

.kiwi-statebrowser-channel.kiwi-statebrowser-channel-active {
    font-weight: 600;
    opacity: 1;
}

/* New Channel Button */
.kiwi-statebrowser-newchannel {
    padding: 0;
    height: auto;
    width: 100%;
    border-top: none;
    box-sizing: border-box;
    margin: 1em 0;
}

.kiwi-statebrowser-newchannel a {
    width: 90%;
    padding: 0 10px 0 10px;
    line-height: 35px;
    font-size: 0.8em;
    font-weight: 500;
    cursor: pointer;
    display: block;
    box-sizing: border-box;
    background: none;
    text-align: left;
    position: relative;
    border-radius: 4px;
    margin: 0 5%;
    transition: all 0.3s;
}

.kiwi-statebrowser-newchannel a i {
    position: absolute;
    right: 10px;
    line-height: 35px;
    font-size: 1.2em;
}

.kiwi-statebrowser-newchannel a i:hover {
    opacity: 1;
}

.kiwi-statebrowser-usermenu .fa-caret-down {
    transition: all 0.3s;
}

.kiwi-statebrowser-usermenu--open .fa-caret-down {
    transform: rotate(-180deg);
}

.kiwi-statebrowser-switcher a {
    display: inline-block;
    width: 50%;
    padding: 5px 0;
    font-size: 1.2em;
    cursor: pointer;
    text-align: center;
}

.kiwi-statebrowser-availablenetworks-link a {
    cursor: pointer;
}

.kiwi-statebrowser-usermenu-body a:hover {
    text-decoration: underline;
}

.kiwi-statebrowser-usermenu-body .close-icon {
    position: absolute;
    right: 0;
    top: 0;
    cursor: pointer;
    padding: 0.2em 0.4em;
    border-radius: 0 0 0 0.4em;
    transition: all 0.3s;
}

.kiwi-statebrowser-scrollarea {
    height: auto;
    margin-bottom: 0;
    box-sizing: border-box;
    overflow-y: auto;
    width: 100%;
    flex: 1;
}

.kiwi-statebrowser-network {
    margin-bottom: 2em;
    overflow: hidden;
}

.kiwi-statebrowser-network:last-child {
    margin-bottom: 0;
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
}

.kiwi-statebrowser-availablenetworks-networks {
    overflow: hidden;
    max-height: 0;
    transition: max-height 0.5s;
}

.kiwi-statebrowser-availablenetworks-networks--open {
    max-height: 500px;
}

.kiwi-statebrowser-newchannel-inputwrap {
    padding: 3px;
}

.kiwi-statebrowser-newchannel-inputwrap input {
    outline: none;
    border: none;
    display: block;
    width: calc(100% - 20px);
    margin-right: 30px;
}

.kiwi-statebrowser-newchannel-inputwrap i {
    position: absolute;
    right: 5px;
    top: 5px;
    cursor: pointer;
}

.kiwi-statebrowser-mobile-close {
    display: none;
}

.kiwi-statebrowser-availablenetworks-link {
    border-right: 15px solid red;
}

.kiwi-statebrowser-availablenetworks-link--connected {
    border-color: green;
}

.kiwi-statebrowser-channel-label-transition-enter-active,
.kiwi-statebrowser-channel-label-transition-leave-active {
    transition: opacity 0.1s;
}

.kiwi-statebrowser-channel-label-transition-enter,
.kiwi-statebrowser-channel-label-transition-leave-active {
    opacity: 0;
}

.kiwi-statebrowser-newchannel-inputwrap--focus {
    opacity: 1;
}

@media screen and (max-width: 769px) {
    .kiwi-statebrowser {
        left: -100%;
        padding-top: 0;
        z-index: 1000;
    }

    .kiwi-wrap.kiwi-wrap--statebrowser-drawopen .kiwi-statebrowser {
        width: 75%;
        left: 0;
        z-index: 100;
    }

    .kiwi-header {
        text-align: center;
    }

    .kiwi-container-toggledraw-statebrowser-messagecount {
        width: 30px;
        color: #000;
        font-weight: 600;
        max-height: 49.5px;
    }

    //Resize the buttons within the statebrowser
    .kiwi-statebrowser-newchannel a {
        margin-right: 2.5%;
        margin-left: 2.5%;
        width: 95%;
    }

    .kiwi-statebrowser-mobile-close {
        width: 100%;
        color: #fff;
        display: block;
        padding: 0 10px;
        font-weight: 600;
        background: #42b992;
        box-sizing: border-box;
        margin-bottom: 0;
        text-transform: uppercase;
        line-height: 45px;
        height: 45px;

        span {
            float: left;
        }

        i {
            float: right;
            font-size: 1.2em;
            line-height: 45px;
        }
    }

    .kiwi-statebrowser-usermenu {
        position: relative;
    }
}

</style>
