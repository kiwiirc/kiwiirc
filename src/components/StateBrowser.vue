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
        </div>

        <div class="kiwi-statebrowser-scrollarea">
            <div class="kiwi-statebrowser-networks">
                <div class="kiwi-statebrowser-network" v-for="network in networks">
                    <a class="kiwi-statebrowser-network-name u-link" @click="setActiveBuffer(network.serverBuffer())">{{network.name}}</a>

                        <transition name="kiwi-statebrowser-network-status-transition">
                        <div v-if="network.state !== 'connected'" class="kiwi-statebrowser-network-status">
                            <template v-if="!network.connection.server">
                                <a @click="showNetworkSettings(network)" class="u-link">Configure network</a>
                            </template>
                            <template v-else-if="network.state === 'disconnected'">
                                Not connected.
                                <a @click="network.ircClient.connect()" class="u-link">Connect</a>
                            </template>
                            <template v-else-if="network.state === 'connecting'">
                                Connecting...
                            </template>
                        </div>
                        </transition>

                    <div class="kiwi-statebrowser-channels">
                        <div
                            v-for="buffer in orderedBuffers(network.buffers)"
                            class="kiwi-statebrowser-channel"
                            v-bind:class="{
                                'kiwi-statebrowser-channel-active': isActiveBuffer(buffer),
                                'kiwi-statebrowser-channel-notjoined': buffer.isChannel() && !buffer.joined
                            }"
                        >
                            <div class="kiwi-statebrowser-channel-name u-link" @click="setActiveBuffer(buffer)">{{buffer.name}}</div>
                            <div class="kiwi-statebrowser-channel-labels">
                                <transition name="kiwi-statebrowser-channel-label-transition">
                                <div v-if="buffer.flags.unread" class="kiwi-statebrowser-channel-label">
                                    {{buffer.flags.unread}}
                                </div>
                                </transition>
                            </div>

                            <div
                                class="kiwi-statebrowser-channel-settings"
                                @click.stop="showBufferPopup(buffer, $event.clientY)"
                            >
                                <i class="fa fa-cog" aria-hidden="true"></i>
                            </div>
                        </div>
                    </div>

                    <form
                        v-if="network.state === 'connected'"
                        @submit.prevent="submitNewChannelForm"
                        class="kiwi-statebrowser-newchannel"
                    >
                        <div class="kiwi-statebrowser-newchannel-inputwrap">
                            <input
                                type="text"
                                placeholder="Join new #channel"
                                v-model="new_channel_input"
                                @focus="onNewChannelInputFocus"
                                @blur="onNewChannelInputBlur"
                            /> <i @click="submitNewChannelForm" class="fa fa-plus" aria-hidden="true"></i>
                        </div>
                    </form>
                </div>
            </div>

            <div class="kiwi-statebrowser-options">
                <a @click="clickAddNetwork" v-if="!isRestrictedServer">Add network</a>
                <a @click="clickAppSettings">Settings</a>
                <a @click="clickForget" v-if="isPersistingState">Forget Me</a>
            </div>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import state from 'src/libs/state';
import AppSettings from './AppSettings';
import NetworkSettings from './NetworkSettings';
import BufferSettings from './BufferSettings';

export default {
    data: function data() {
        return {
            // Name of the buffer that should show its popup
            popup_buffername: null,
            popup_networkid: null,
            popup_top: 0,
            new_channel_input: '',
        };
    },
    props: ['networks'],
    components: {
        BufferSettings,
    },
    methods: {
        setActiveBuffer: function switchContainer(buffer) {
            // Clear any active component to show the buffer again
            state.$emit('active.component', null);
            state.setActiveBuffer(buffer.networkid, buffer.name);
        },
        isActiveBuffer: function isActiveBuffer(buffer) {
            return (
                buffer.networkid === state.ui.active_network &&
                buffer.name === state.ui.active_buffer
            );
        },
        orderedBuffers: function orderedBuffers(buffers) {
            // Since vuejs will sort in-place and update views when .sort is called
            // on an array, clone it first so that we have a plain array to sort
            let list = buffers.map(b => b);

            list = _.filter(list, buffer => !buffer.isServer());
            list = list.sort((a, b) => {
                let order = 0;
                if (a.isChannel() && b.isQuery()) {
                    order = -1;
                } else if (a.isQuery() && b.isChannel()) {
                    order = 1;
                } else {
                    order = a.name.localeCompare(b.name);
                }

                return order;
            });

            return list;
        },
        showNetworkSettings: function showNetworkSettings(network) {
            state.$emit('active.component', NetworkSettings, {
                network,
            });
        },
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
        submitNewChannelForm: function submitNewChannelForm() {
            let newChannelVal = this.new_channel_input;
            this.new_channel_input = '#';

            // Simply pass it onto the /join handler so it acts in the same way
            if (newChannelVal) {
                state.$emit('input.raw', '/join ' + newChannelVal);
            }
        },
        clickAddNetwork: function clickAddNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork('New Network', nick, {});
            state.$emit('active.component', NetworkSettings, {
                network,
            });
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
        },
    },
    computed: {
        activeBuffer: function activeBuffer() {
            return {
                networkid: state.ui.active_network,
                buffer: state.ui.active_buffer,
            };
        },
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
    },
    created: function created() {
        state.$on('document.clicked', () => {
            this.showBufferPopup(null);
        });
    },
};
</script>

<style>
.kiwi-statebrowser {
    box-sizing: border-box;
    z-index: 2;
}

.kiwi-statebrowser-scrollarea {
    overflow: auto;
    height: 100%;
    width: 100%;
}
.kiwi-statebrowser-networks {
    padding-bottom: 60px; /* .kiwi-statebrowser-options height+padding */
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
</style>
