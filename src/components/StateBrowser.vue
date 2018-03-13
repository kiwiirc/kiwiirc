<template>
    <div class="kiwi-statebrowser">

        <div class="mobile-close-statebrowser" @click="hideStatebrowser">
            <span> Close </span>
            <i class="fa fa-times" aria-hidden="true"></i>
        </div>

        <div class="kiwi-statebrowser-profile">
            <div class="user-avatar">
                U
            </div>
            <div class="user-options" @click="clickAppSettings">
                Kiwi Settings <i class="fa fa-cog" aria-hidden="true"></i>
            </div>
        </div>


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
            <!--
            <a class="kiwi-statebrowser-usermenu-header" @click="is_usermenu_open=!is_usermenu_open">{{$t('state_account')}} <i class="fa fa-caret-down"></i></a>
            <div v-if="is_usermenu_open" class="kiwi-statebrowser-usermenu-body">
                <p> {{$t('state_remembered')}} </p>
                <a @click="clickForget">{{$t('state_forget')}}</a>
                <div class="close-icon" @click="is_usermenu_open=false">
                  <i class="fa fa-times" aria-hidden="true"></i>
                </div>
            </div>
            -->


            <!-- <div class="kiwi-statebrowser-divider"></div> -->
        </div>

        <!--
        <div class="kiwi-statebrowser-switcher">
            <a@click="clickAddNetwork" v-if="!isRestrictedServer" ><i class="fa fa-plus" aria-hidden="true"></i></a><a @click="clickAppSettings" ><i class="fa fa-cog" aria-hidden="true"></i></a>
        </div>
        -->

        <!--
        <div v-if="networks.length === 0" class="kiwi-statebrowser-nonetworks">
            {{$t('state_network')}}<br><a class="u-link" @click="clickAddNetwork">{{$t('state_add')}}</a>
        </div>
        -->

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

        <div class="kiwi-statebrowser-channelfilter" v-if="isConnected  && !add_channel_open">
            <input
                type="text"
                v-model="channel_filter"
                placeholder="Filter Channels..."
            />
            <p v-if="channel_filter">Show Advanced Options</p>
        </div>

        <div class="kiwi-statebrowser-channels-info" v-if="!channel_filter">
            <form
                @submit.prevent="submitNewChannelForm"
                class="kiwi-statebrowser-newchannel"
                v-if="isConnected"
            >
                <a class="u-button u-button-primary" v-bind:class="{ active: add_channel_open }"  @click="add_channel_open=true">Add Channel <i class="fa fa-plus-circle" aria-hidden="true"></i></a>
                <div
                    v-if="add_channel_open"
                    v-focus
                    class="kiwi-statebrowser-newchannel-inputwrap"
                    :class="[
                        new_channel_input_has_focus ?
                            'kiwi-statebrowser-newchannel-inputwrap--focus' :
                            ''
                    ]"
                >
                    <input
                        type="text"
                        :placeholder="$t('state_join')"
                        v-model="new_channel_input"
                        @focus="onNewChannelInputFocus"
                        @blur="onNewChannelInputBlur"
                    /> <i @click="submitNewChannelForm" class="fa fa-plus" aria-hidden="true"></i>
                </div>
            </form>
        </div>

        <div class="kiwi-statebrowser-newnetwork" v-if="!channel_filter && !add_channel_open">
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
import * as Misc from '@/helpers/Misc';

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
            is_usermenu_open: false,
            show_provided_networks: false,
            provided_networks: Object.create(null),
            pluginUiElements: GlobalApi.singleton().stateBrowserPlugins,
            new_channel_input: '',
            add_channel_open: false,
            new_channel_input_has_focus: false,
            channel_filter: '',
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
            this.add_channel_open = false;
        },
        submitNewChannelForm() {
            let newChannelVal = this.new_channel_input;
            this.new_channel_input = '#';

            let network = state.getActiveNetwork();
            let bufferObjs = Misc.extractBuffers(newChannelVal);

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            bufferObjs.forEach(bufferObj => {
                let chanName = bufferObj.name;
                let ignoreNames = ['#0', '0', '&0'];
                if (ignoreNames.indexOf(chanName) > -1 || chanName.replace(/[#&]/g, '') === '') {
                    return;
                }

                let newBuffer = state.addBuffer(network.id, chanName);
                if (newBuffer && !hasSwitchedActiveBuffer) {
                    state.setActiveBuffer(network.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }

                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }

                if (network.isChannelName(chanName)) {
                    network.ircClient.join(chanName, bufferObj.key);
                }
            });
        },
        clickAddNetwork: function clickAddNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork('Network', nick, {});
            state.$emit('network.settings', network);
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
        isConnected: function isConnected() {
            return state.getActiveNetwork().state === 'connected';
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

<style lang="less">

.kiwi-statebrowser {
    box-sizing: border-box;
    z-index: 11; /* Must be at least 1 higher than the workspace :after z-index; */
    display: flex;
    flex-direction: column;
    background: #22231f;
    border-right: none;
    width: 220px;
    color: #fff;
    text-align: center;
    padding-top: 10px;
    overflow: hidden;

    h1 {
        width: 100%;
        font-size: 1em;
        opacity: 0.8;
        cursor: default;
        padding: 20px 0 27px 0;
    }

    .kiwi-statebrowser-profile {
        width: 100%;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.5);
        margin-bottom: 10px;

        .user-avatar {
            width: 50px;
            height: 50px;
            border: 2px solid #42b992;
            background-color: #000;
            color: #fff;
            cursor: pointer;
            font-size: 1.5em;
            text-align: center;
            line-height: 50px;
            border-radius: 50%;
            overflow: hidden;
            margin: 0 auto 10px auto;
            transition: all 0.3s;

            &:hover {
                background-color: #42b992;
                color: #fff;
            }
        }

        /* User Settings */
        .user-options {
            width: 90%;
            text-align: left;
            padding: 0 10px 0 10px;
            border: 1px solid rgba(255, 255, 255, 0.5);
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

            &:hover {
                background: #42b992;
                color: #fff;
                opacity: 1;
            }
        }

        .user-options span {
            font-weight: 600;
        }

        .user-options i {
            float: right;
            line-height: 35px;
            font-size: 1.2em;
        }
    }

    /* Add channel input */
    .kiwi-statebrowser-newchannel-inputwrap {
        position: relative;
        border-radius: 3px;
        color: #fff;
        opacity: 1;
        transition: opacity 0.3s;
        background: none;
        padding: 0 10px 0 10px;
        margin: 10px 0 10px 0;

        i {
            position: absolute;
            right: 20px;
            pointer-events: none;
            top: 14px;
        }
    }

    .kiwi-statebrowser-newchannel-inputwrap input[type='text'] {
        width: 100%;
        height: 40px;
        padding: 0 10px;
        line-height: 40px;
        font-size: 1em;
        color: #000;
        box-sizing: border-box;
        background: #fff;
        border: none;
        margin: 15px 0 10px 0;
        border-radius: 2px;
        min-height: none;
        overflow-x: hidden;
        overflow-y: auto;
        max-width: none;
    }

    .kiwi-statebrowser-newchannel-inputwrap--focus {
        opacity: 1;
        background-color: #fff;
    }

    /* Set the height of the networks scroll box */
    .kiwi-statebrowser-scrollarea {
        height: auto;
        background-color: #131312;
        margin-bottom: 0;
        box-sizing: border-box;
        overflow-y: auto;
    }

    /*Channel search input */
    .kiwi-statebrowser-channelfilter {
        width: 100%;
        padding: 0 0 0 0;
        box-sizing: border-box;
        position: relative;
        opacity: 0.8;
        transition: all 0.3s;
        margin-bottom: 10px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.5);
    }

    .kiwi-statebrowser-channelfilter:hover {
        opacity: 1;
    }

    .kiwi-statebrowser-channelfilter::after {
        content: '\f002';
        position: absolute;
        top: 9px;
        right: 20px;
        font-size: 1em;
        color: #000;
        z-index: 10;
        pointer-events: none;
        font-family: fontAwesome, sans-serif;
    }

    .kiwi-statebrowser-channelfilter input {
        width: 100%;
        height: 42px;
        line-height: 42px;
        background-color: #fff;
        color: #000;
        padding: 0 15px;
        border: none;
        border-radius: 0;
        box-sizing: border-box;
    }

    .kiwi-statebrowser-channelfilter p {
        color: #42b992;
        text-align: center;
        font-size: 0.9em;
        margin: 10px 0 10px 0;
        cursor: pointer;
        transition: all 0.3s;
    }

    .kiwi-statebrowser-channelfilter p:hover {
        text-decoration: underline;
        color: #6dcdad;
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
        width: 90%;
        padding: 0 10px;
        margin: 0 5% 10px 5%;
        color: #fff;
        opacity: 1;
        line-height: 35px;
        cursor: pointer;
        display: block;
        box-sizing: border-box;
        background: none;
        text-align: left;
        position: relative;
        border-radius: 4px;
        font-size: 0.8em;
        transition: all 0.3s;
        border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .kiwi-statebrowser-newnetwork a i {
        position: absolute;
        right: 10px;
        line-height: 35px;
        font-size: 1.2em;
    }

    .kiwi-statebrowser-newnetwork a:hover {
        background: #42b992;
        border-color: #42b992;
        opacity: 1;
        color: #fff;
    }

    .kiwi-statebrowser-network .kiwi-statebrowser-network-header {
        line-height: 45px;
        text-align: left;
        background-color: #454545;
        position: relative;
    }

    .kiwi-statebrowser-network .kiwi-statebrowser-network-header a {
        text-align: left;
        padding: 0 1em;
        text-transform: capitalize;
        color: #fff;
        width: 100%;
        font-size: 1em;
        font-weight: 600;
    }

    .kiwi-statebrowser-network .kiwi-statebrowser-network-header .kiwi-statebrowser-network-toggle {
        position: absolute;
        top: 50%;
        margin: -6px 5px 0 0;
        width: 14px;
        right: 0;
    }

    /* Active Network Styling */
    .kiwi-statebrowser-network.kiwi-statebrowser-network--active .kiwi-statebrowser-network-header {
        border-left: 3px solid #42b992;
    }

    /* Channel Styling */
    .kiwi-statebrowser-channels {
        .kiwi-statebrowser-channel {
            border-bottom: 1px solid #4a4b47;
            line-height: 30px;
            padding: 0 1em;
            color: #fff;
            opacity: 0.8;
            transition: opacity 0.3s;

            .kiwi-statebrowser-channel-name {
                color: #fff;
                text-align: left;
                font-weight: 100;
                font-size: 0.8em;
            }

            .kiwi-statebrowser-channel-label {
                background: #d16c6c;
                margin: 4px 0;
            }

            &:hover {
                opacity: 1;
            }
        }

        .kiwi-statebrowser-channel.kiwi-statebrowser-channel-active {
            border-left: 3px solid #42b992;
            font-weight: 600;
            opacity: 1;
        }
    }

    .kiwi-statebrowser-divider {
        background: rgba(255, 255, 255, 0.3);
        margin: 8px 12px;
        height: 1px;
    }

    /* New Channel Button */
    .kiwi-statebrowser-newchannel {
        padding: 0;
        margin: 10px 0 0 0;
        height: auto;
        width: 100%;
        border-top: none;
        box-sizing: border-box;
        margin-bottom: 10px;

        a {
            width: 90%;
            padding: 0 10px 0 10px;
            color: #fff;
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
            border: none;
            border: 1px solid rgba(255, 255, 255, 0.5);
            margin: 0 5%;
            transition: all 0.3s;

            i {
                position: absolute;
                right: 10px;
                line-height: 35px;
                font-size: 1.2em;
            }

            &:hover {
                background: #42b992;
                opacity: 1;
                color: #fff;
            }
        }
    }
}

.kiwi-statebrowser-usermenu .fa-caret-down {
    transition: all 0.3s;
}

.kiwi-statebrowser-usermenu--open .fa-caret-down {
    transform: rotate(-180deg);
}

.kiwi-statebrowser-divider {
    display: none;
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
    background-color: #fc6262;
    color: #fff;
    transition: all 0.3s;
}

.kiwi-statebrowser-usermenu-body .close-icon:hover {
    background-color: #fe7575;
}

.kiwi-statebrowser-switcher a:first-of-type {
    background: rgba(255, 255, 255, 0.15);
}

.kiwi-statebrowser-switcher a:hover {
    background: rgba(255, 255, 255, 0.1);
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
    margin-bottom: 0;
}

.kiwi-statebrowser-options {
    position: absolute;
    bottom: 0;
    padding: 15px;
    height: 30px;
    background: #383838;

    /* some space on the right so it doesnt overlap the parent elements scrollbar */
    margin-right: 10px;
}

.kiwi-statebrowser-nonetworks {
    background: rgba(255, 255, 255, 0.15);
    padding: 5px;
    text-align: center;
}

.kiwi-statebrowser-availablenetworks-toggle {
    cursor: pointer;
    background: rgba(255, 255, 255, 0.15);
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
    max-height: 0;
    transition: max-height 0.5s;
}

.kiwi-statebrowser-availablenetworks-networks--open {
    max-height: 500px;
}

.kiwi-statebrowser-newchannel {
    margin: 1em 0.5em;
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

.mobile-close-statebrowser {
    display: none;
}

.kiwi-statebrowser-availablenetworks {
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.kiwi-statebrowser-availablenetworks-link {
    border-right: 15px solid red;
}

.kiwi-statebrowser-availablenetworks-link--connected {
    border-color: green;
}

.kiwi-statebrowser-channel-notjoined .kiwi-statebrowser-channel-name {
    color: #d03232;
}

.kiwi-statebrowser-channel-active .kiwi-statebrowser-channel-name {
    color: #df6b26;
}

.kiwi-statebrowser-channel-label {
    background: green;
    color: #dedede;
}

.kiwi-statebrowser-channel-label--highlight {
    background: #d62323;
}

.kiwi-statebrowser-channel-label-transition-enter-active,
.kiwi-statebrowser-channel-label-transition-leave-active {
    transition: opacity 0.1s;
}

.kiwi-statebrowser-channel-label-transition-enter,
.kiwi-statebrowser-channel-label-transition-leave-active {
    opacity: 0;
}

.kiwi-statebrowser-channel-popup {
    background: #383838;
    border: 3px solid #6b6b6b;
    border-left: none;
}

.kiwi-statebrowser-newchannel-inputwrap--focus {
    opacity: 1;
}

@media screen and (max-width: 769px) {
    .kiwi-statebrowser {
        left: -220px;
        padding-top: 0;
    }

    .kiwi-wrap.kiwi-wrap--statebrowser-drawopen .kiwi-statebrowser {
        width: 100%;
        left: 0;
        z-index: 999;
    }

    .kiwi-wrap--statebrowser-drawopen .kiwi-workspace {
        width: 0;
    }

    .kiwi-header {
        text-align: center;
    }

    .kiwi-header .kiwi-header-notjoined {
        display: inline-block;
        margin: 10px auto;
    }

    .kiwi-container-toggledraw-statebrowser-messagecount {
        width: 30px;
        color: #000;
        font-weight: 600;
        max-height: 49.5px;
    }

    //Resize the buttons within the statebrowser
    .kiwi-statebrowser .kiwi-statebrowser-newchannel a,
    .kiwi-statebrowser .kiwi-statebrowser-profile .user-options,
    .kiwi-statebrowser .kiwi-statebrowser-newnetwork a {
        margin-right: 2.5%;
        margin-left: 2.5%;
        width: 95%;
    }

    .mobile-close-statebrowser {
        width: 100%;
        color: #fff;
        display: block;
        font-size: 1em;
        padding: 0.5em 10px;
        font-weight: 600;
        background: #42b992;
        box-sizing: border-box;
        margin-bottom: 10px;
        text-transform: uppercase;

        span {
            float: left;
        }

        i {
            float: right;
            font-size: 1.2em;
        }
    }
}

</style>
