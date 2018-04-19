<template>
    <div class="kiwi-statebrowser-network" :class="[
        isActiveNetwork ? 'kiwi-statebrowser-network--active' : '',
    ]">
        <div class="kiwi-statebrowser-network-header">
            <a class="kiwi-statebrowser-network-name u-link" @click="setActiveBuffer(network.serverBuffer())">{{network.name}}</a>
            <div class="kiwi-network-name-hover-icon">
                <i class="fa fa-ellipsis-h" aria-hidden="true"></i>
            </div>
            <div class="kiwi-network-name-options">
                <div class="option-button kiwi--collapse" v-if="totalNetworkCount > 1" @click="collapsed=!collapsed">
                    <i class="fa" :class="[collapsed?'fa-plus-square-o':'fa-minus-square-o']" aria-hidden="true"></i>
                </div>
                <div class="option-button kiwi--channel" v-bind:class="{ active: channel_add_display == true }"  @click="toggleAddChannel()">
                    <i class="fa fa-plus" aria-hidden="true"></i>
                </div>
                <div class="option-button kiwi-search-channels" v-if="network.buffers.length > 1"  v-bind:class="{ active: channel_filter_display == true }"  @click="toggleFilterChannel()">
                    <i class="fa fa-search" aria-hidden="true"></i>
                </div>
            </div>
        </div>

        <div class="kiwi-statebrowser-channelfilter" v-if="channel_filter_display">
            <input
                type="text"
                v-focus
                v-model="channel_filter"
                @blur="onChannelFilterInputBlur"
                placeholder="Filter Channels..."
            />
            <p><a @click="closeFilterChannel(); showNetworkChannels(network)">Find more channels</a></p>
        </div>

        <div class="kiwi-statebrowser-channels-info" v-if="channel_add_display">
            <form
                @submit.prevent="submitNewChannelForm"
                class="kiwi-statebrowser-newchannel"
            >
                <div
                    v-focus
                    class="kiwi-statebrowser-newchannel-inputwrap"
                    :class="[
                        channel_add_input_has_focus ?
                            'kiwi-statebrowser-newchannel-inputwrap--focus' :
                            ''
                    ]"
                >
                    <input
                        type="text"
                        :placeholder="$t('state_join')"
                        v-model="channel_add_input"
                        @focus="onNewChannelInputFocus"
                        @blur="onNewChannelInputBlur"
                    />
                </div>
            </form>
        </div>

        <div class="kiwi-statebrowser-network-toggable-area" :class="[
            collapsed ? 'kiwi-statebrowser-network-toggable-area--collapsed' : '',
        ]">
            <transition name="kiwi-statebrowser-network-status-transition">
            <div v-if="network.state !== 'connected'" class="kiwi-statebrowser-network-status">
                <template v-if="network.state_error">
                    <i class="fa fa-exclamation-triangle" aria-hidden="true"></i> <a @click="showNetworkSettings(network)" class="u-link">{{$t('state_configure')}}</a>
                </template>
                <template v-else-if="!network.connection.server">
                    <a @click="showNetworkSettings(network)" class="u-link">{{$t('state_configure')}}</a>
                </template>
                <template v-else-if="network.state === 'disconnected'">
                    {{$t('state_disconnected')}}
                    <a @click="network.ircClient.connect()" class="u-link">{{$t('connect')}}</a>
                </template>
                <template v-else-if="network.state === 'connecting'">
                    {{$t('connecting')}}
                </template>
            </div>
            </transition>

            <div class="kiwi-statebrowser-channels">
                <div
                    v-for="buffer in filteredBuffers(network.buffers)"
                    class="kiwi-statebrowser-channel"
                    v-bind:class="{
                        'kiwi-statebrowser-channel-active': isActiveBuffer(buffer),
                        'kiwi-statebrowser-channel-notjoined': buffer.isChannel() && !buffer.joined
                    }"
                >
                    <div class="kiwi-statebrowser-channel-name" @click="setActiveBuffer(buffer)">{{buffer.name}}</div>
                    <div class="kiwi-statebrowser-channel-labels">
                        <transition name="kiwi-statebrowser-channel-label-transition">
                        <div v-if="buffer.flags.unread && showMessageCounts(buffer)" class="kiwi-statebrowser-channel-label" :class="{'kiwi-statebrowser-channel-label--highlight': buffer.flags.highlight}">
                            {{buffer.flags.unread}}
                        </div>
                        </transition>
                    </div>

                    <div
                        v-if="buffer.isChannel()"
                        class="kiwi-statebrowser-channel-settings"
                        @click="showBufferSettings(buffer)"
                    >
                        <i class="fa fa-cog" aria-hidden="true"></i>
                    </div>

                    <div class="kiwi-statebrowser-channel-leave" @click="closeBuffer(buffer)">
                        <i class="fa fa-times" aria-hidden="true"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import state from '@/libs/state';
import * as Misc from '@/helpers/Misc';
import BufferSettings from './BufferSettings';

export default {
    data: function data() {
        return {
            collapsed: false,
            channel_filter: '',
            channel_filter_display: false,
            channel_add_display: false,
            channel_add_input_has_focus: false,
            channel_add_input: '',
        };
    },
    props: ['network', 'uiState'],
    components: {
        BufferSettings,
    },
    methods: {
        onNewChannelInputFocus() {
            // Auto insert the # if no value is already in. Easier for mobile users
            if (!this.channel_add_input) {
                this.channel_add_input = '#';
            }

            this.channel_add_input_has_focus = true;
        },
        onNewChannelInputBlur() {
            // Remove the # since we may have auto inserted it as they tabbed past
            if (this.channel_add_input === '#') {
                this.channel_add_input = '';
            }

            // If nothing was entered into the input box, hide it just to clean up the UI
            if (!this.channel_add_input) {
                this.channel_add_display = false;
            }

            this.channel_add_input_has_focus = false;
        },
        submitNewChannelForm() {
            let newChannelVal = this.channel_add_input;
            this.channel_add_input = '#';

            let network = this.network;
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
        onChannelFilterInputBlur() {
            // If nothing was entered into the input box, hide it just to clean up the UI
            if (!this.channel_filter) {
                // Hacky, but if we remove the channel filter UI at this blur event and the user
                // clicked a link in this filter UI, then the click event will not hit the target
                // link as it has been removed before the event reaches it.
                setTimeout(() => {
                    this.closeFilterChannel();
                }, 100);
            }
        },
        closeBuffer(buffer) {
            state.removeBuffer(buffer);
        },
        showMessageCounts: function showMessageCounts(buffer) {
            return !buffer.setting('hide_message_counts');
        },
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
        filteredBuffers(buffers) {
            let filter = this.channel_filter;
            let filtered = [];

            if (!filter) {
                filtered = buffers;
            } else {
                filtered = _.filter(buffers, buffer => {
                    let name = buffer.name.toLowerCase();
                    return name.indexOf(filter) > -1;
                });
            }

            return this.orderedBuffers(filtered);
        },
        showNetworkSettings: function showNetworkSettings(network) {
            network.showServerBuffer('settings');
        },
        showNetworkChannels(network) {
            network.showServerBuffer('channels');
        },
        showBufferSettings(buffer) {
            this.setActiveBuffer(buffer);
            this.uiState.showBufferSettings();
        },
        toggleAddChannel() {
            this.channel_add_display = !this.channel_add_display;
            this.channel_filter_display = false;
        },
        toggleFilterChannel() {
            this.channel_filter_display = !this.channel_filter_display;
            this.channel_add_display = false;
        },
        closeFilterChannel() {
            this.channel_filter = '';
            this.channel_filter_display = false;
        },
    },
    computed: {
        isActiveNetwork: function isActiveNetwork() {
            return state.getActiveNetwork() === this.network;
        },
        totalNetworkCount() {
            return state.networks.length;
        },
    },
};
</script>

<style>

.kiwi-channel-options-header {
    text-align: left;
    padding: 0 0 0 10px;
    margin: 0;
    opacity: 1;
    cursor: default;
    float: left;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-channel-options-header span {
    padding: 5px 0;
    float: left;
    font-size: 1.2em;
    font-weight: 600;
}

.kiwi-statebrowser-network-header {
    display: block;
    padding-right: 0;
    position: relative;
    overflow: hidden;
    height: auto;
}

.kiwi-statebrowser-network-name {
    flex: 1;
    font-size: 1.1em;
    text-align: center;
    display: block;
    padding: 4px 0;
    box-sizing: border-box;
}

.kiwi-network-name-hover-icon {
    position: absolute;
    right: 0;
    top: 0;
    height: 45px;
    z-index: 2;
    width: 45px;
    text-align: center;
    line-height: 45px;
}

.kiwi-network-name-options {
    position: absolute;
    top: 0;
    height: 45px;
    z-index: 10;
    right: -300px;
    transition: all 0.15s;
}

.kiwi-statebrowser-network-header:hover .kiwi-network-name-options {
    right: 0;
    opacity: 1;
}

.kiwi-network-name-options .option-button {
    float: right;
    width: 35px;
    transition: all 0.15s;
    padding: 0;
    line-height: 45px;
    text-align: center;
    cursor: pointer;
}

.kiwi-statebrowser-network-toggable-area--collapsed {
    display: none;
}

.kiwi-statebrowser-network-status {
    text-align: center;
    padding: 4px;
    overflow: hidden;
    position: relative;
    height: 1.5em;
    font-size: 0.9em;
}

/* During DOM entering and leaving */
.kiwi-statebrowser-network-status-transition-enter-active,
.kiwi-statebrowser-network-status-transition-leave-active {
    transition: height 0.7s, padding 0.7s;
}

.kiwi-statebrowser-network-status-transition-enter,
.kiwi-statebrowser-network-status-transition-leave-active {
    height: 0;
    padding: 0;
}

.kiwi-statebrowser-channel {
    position: relative;
    display: flex;
}

.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-name {
    text-decoration: underline;
}

.kiwi-statebrowser-channel-name {
    cursor: pointer;
    flex: 1;
    transition: padding 0.1s, border 0.1s;
}

.kiwi-statebrowser-channel-labels {
    position: absolute;
    right: 0;
    text-align: center;
    z-index: 0;
    top: 0;
}

.kiwi-statebrowser-channel-label {
    display: inline-block;
    padding: 0 10px;
    line-height: 30px;
    height: 30px;
    margin: 0;
    border-radius: 5px 0 0 5px;
    font-weight: 600;
}

.kiwi-statebrowser-channel-label:hover {
    opacity: 1;
}

.kiwi-statebrowser-channel-label-transition-enter-active,
.kiwi-statebrowser-channel-label-transition-leave-active {
    transition: opacity 0.1s;
}

.kiwi-statebrowser-channel-label-transition-enter,
.kiwi-statebrowser-channel-label-transition-leave-active {
    opacity: 0;
}

.kiwi-statebrowser-channel-settings {
    display: block;
    height: 100%;
    width: 35px;
    opacity: 0;
    text-align: center;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
    z-index: 10;
}

.kiwi-statebrowser-channel-leave {
    float: right;
    opacity: 0;
    width: 35px;
    cursor: pointer;
    margin-right: 0;
    transition: all 0.3s;
    z-index: 10;
}

.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-settings,
.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-leave {
    opacity: 1;
}

/* Add channel input */
.kiwi-statebrowser-newchannel-inputwrap {
    float: left;
    width: 100%;
    position: relative;
    border-radius: 3px;
    opacity: 1;
    transition: opacity 0.3s;
    background: none;
    padding: 0;
    margin: 0 0 0 0;
    box-sizing: border-box;
}

.kiwi-statebrowser-newchannel-inputwrap input[type='text'] {
    width: 100%;
    height: 40px;
    padding: 0 15px;
    line-height: 40px;
    font-size: 0.8em;
    box-sizing: border-box;
    border: none;
    margin: 0;
    border-radius: 0;
    min-height: none;
    overflow-x: hidden;
    overflow-y: auto;
    max-width: none;
}

.kiwi-statebrowser-newchannel-inputwrap--focus {
    opacity: 1;
}

/* Channel search input */
.kiwi-statebrowser-channelfilter {
    float: left;
    width: 100%;
    padding: 0;
    box-sizing: border-box;
    position: relative;
    opacity: 1;
    transition: all 0.3s;
    margin-bottom: 0;
}

.kiwi-statebrowser-channelfilter:hover {
    opacity: 1;
}

.kiwi-statebrowser-channelfilter input {
    width: 100%;
    height: 42px;
    line-height: 42px;
    padding: 0 15px;
    border: none;
    border-radius: 0;
    box-sizing: border-box;
}

.kiwi-statebrowser-channelfilter p {
    text-align: center;
    font-size: 0.9em;
    margin: 10px 0 10px 0;
    cursor: pointer;
    transition: all 0.3s;
}

.kiwi-statebrowser-channelfilter p:hover {
    text-decoration: underline;
}

@media screen and (max-width: 769px) {
    .kiwi-statebrowser-network-header .kiwi-network-name-options {
        right: 0;
        opacity: 1;
    }

    .kiwi-statebrowser .kiwi-statebrowser-channels .kiwi-statebrowser-channel .kiwi-statebrowser-channel-name {
        line-height: 40px;
    }

    .kiwi-statebrowser-channel .kiwi-statebrowser-channel-settings,
    .kiwi-statebrowser-channel .kiwi-statebrowser-channel-leave {
        opacity: 1;
        line-height: 40px;
    }
}

</style>
