<template>
    <div class="kiwi-statebrowser-network" :class="[
        isActiveNetwork ? 'kiwi-statebrowser-network--active' : '',
    ]">
        <div class="kiwi-statebrowser-network-header">
            <a class="kiwi-statebrowser-network-name u-link" @click="setActiveBuffer(network.serverBuffer())">{{network.name}}</a>
            <a v-if="network.buffers.length > 1" class="kiwi-statebrowser-network-toggle" @click="collapsed=!collapsed">
                <i class="fa" :class="[collapsed?'fa-plus-square-o':'fa-minus-square-o']" aria-hidden="true"></i>
            </a>
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
                    v-for="buffer in orderedBuffers(network.buffers)"
                    class="kiwi-statebrowser-channel"
                    v-bind:class="{
                        'kiwi-statebrowser-channel-active': isActiveBuffer(buffer),
                        'kiwi-statebrowser-channel-notjoined': buffer.isChannel() && !buffer.joined
                    }"
                >
                    <div class="kiwi-statebrowser-channel-name" @click="setActiveBuffer(buffer)">{{buffer.name}}</div>
                    <div class="kiwi-statebrowser-channel-labels">
                        <transition name="kiwi-statebrowser-channel-label-transition">
                        <div v-if="buffer.flags.unread" class="kiwi-statebrowser-channel-label" :class="{'kiwi-statebrowser-channel-label--highlight': buffer.flags.highlight}">
                            {{buffer.flags.unread}}
                        </div>
                        </transition>
                    </div>

                    <div
                        class="kiwi-statebrowser-channel-settings"
                        @click.stop="$emit('showBufferSettings', buffer, $event.clientY)"
                    >
                        <i class="fa fa-bell-o" aria-hidden="true"></i>
                    </div>
                </div>
            </div>

            <form
                v-if="network.state === 'connected'"
                @submit.prevent="submitNewChannelForm"
                class="kiwi-statebrowser-newchannel"
            >
                <div
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
            new_channel_input_has_focus: false,
            new_channel_input: '',
            collapsed: false,
        };
    },
    props: ['network'],
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
            state.$emit('network.settings', network);
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

            this.new_channel_input_has_focus = true;
        },
        onNewChannelInputBlur: function onNewChannelInputBlur() {
            // Remove the # since we may have auto inserted it as they tabbed past
            if (this.new_channel_input === '#') {
                this.new_channel_input = '';
            }

            this.new_channel_input_has_focus = false;
        },
        submitNewChannelForm: function submitNewChannelForm() {
            let newChannelVal = this.new_channel_input;
            this.new_channel_input = '#';

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
    },
    computed: {
        isActiveNetwork: function isActiveNetwork() {
            return state.getActiveNetwork() === this.network;
        },
    },
};
</script>

<style>
.kiwi-statebrowser-network-toggable-area {
}
.kiwi-statebrowser-network-toggable-area--collapsed {
    display: none;
}
.kiwi-statebrowser-network-header {
    display: flex;
    background: rgba(255,255,255,0.15);
}
.kiwi-statebrowser-network-name {
    flex: 1;
    font-size: 1.1em;
    text-align: center;
    display: block;
    padding: 4px 0;
}
.kiwi-statebrowser-network-toggle {
    width: 2em;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}
.kiwi-statebrowser-network-status {
    background: rgba(255,255,255,0.1);
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
    transition: height .7s, padding .7s;
}
/*  */
.kiwi-statebrowser-network-status-transition-enter,
.kiwi-statebrowser-network-status-transition-leave-active {
    height: 0;
    padding: 0;
}

.kiwi-statebrowser-channel {
    position: relative;
    display: flex;
    padding: 5px 10px;
}
.kiwi-statebrowser-channel-active {
    background: rgba(255,255,255,0.05);
}
.kiwi-statebrowser-channel-name {
    cursor: pointer;
    flex: 1;
    transition: padding 0.1s, border 0.1s;
}

.kiwi-statebrowser-channel-label {
    padding: 1px 5px;
    border-radius: 5px;
    line-height: 1.3em;
}
.kiwi-statebrowser-channel-label-transition-enter-active, .kiwi-statebrowser-channel-label-transition-leave-active {
    transition: opacity 0.1s;
}
.kiwi-statebrowser-channel-label-transition-enter, .kiwi-statebrowser-channel-label-transition-leave-active {
    opacity: 0;
}

.kiwi-statebrowser-channel-settings {
    display: none;
    height: 100%;
    width: 20px;
    text-align: center;
    font-weight: bold;
    cursor: pointer;
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
</style>
