<template>
    <div class="kiwi-statebrowser-network">
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
                    @click.stop="$emit('showBufferSettings', buffer, $event.clientY)"
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
                    placeholder="Join new #channel"
                    v-model="new_channel_input"
                    @focus="onNewChannelInputFocus"
                    @blur="onNewChannelInputBlur"
                /> <i @click="submitNewChannelForm" class="fa fa-plus" aria-hidden="true"></i>
            </div>
        </form>
    </div>
</template>

<script>

import _ from 'lodash';
import state from 'src/libs/state';
import NetworkSettings from './NetworkSettings';
import BufferSettings from './BufferSettings';

export default {
    data: function data() {
        return {
            new_channel_input_has_focus: false,
            new_channel_input: '',
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

            // Simply pass it onto the /join handler so it acts in the same way
            if (newChannelVal) {
                state.$emit('input.raw', '/join ' + newChannelVal);
            }
        },
    },
    computed: {
    },
};
</script>

<style>
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
</style>
