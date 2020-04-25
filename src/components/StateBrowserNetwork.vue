<template>
    <div :class="[
        isActiveNetwork ? 'kiwi-statebrowser-network--active' : '',
    ]" class="kiwi-statebrowser-network"
    >
        <div class="kiwi-statebrowser-network-header">
            <a
                class="kiwi-statebrowser-network-name u-link"
                @click="setActiveBuffer(serverBuffer)"
            >
                {{ network.name }}
            </a>
            <div class="kiwi-statebrowser-buffer-actions">
                <div class="kiwi-statebrowser-channel-labels">
                    <div
                        v-if="serverUnread && showMessageCounts(serverBuffer)"
                        :class="[
                            serverHighlight ?
                                'kiwi-statebrowser-channel-label--highlight' :
                                ''
                        ]"
                        class="kiwi-statebrowser-channel-label"
                    >
                        {{ serverUnread > 999 ? "999+": serverUnread }}
                    </div>
                </div>
            </div>
            <div class="kiwi-network-name-options">
                <div
                    v-if="totalNetworkCount > 1"
                    class="kiwi-network-name-option kiwi-network-name-option-collapse"
                    @click="collapsed=!collapsed"
                >
                    <i :class="[collapsed?'fa-plus-square-o':'fa-minus-square-o']" class="fa" />
                </div>
            </div>
        </div>

        <div v-if="channel_filter_display" class="kiwi-statebrowser-channelfilter">
            <input
                v-model="channel_filter"
                v-focus
                :placeholder="$t('filter_channels')"
                type="text"
                @blur="onChannelFilterInputBlur"
                @keyup.esc="closeFilterChannel"
            >
            <p>
                <a @click="closeFilterChannel(); showNetworkChannels(network)">
                    {{ $t('find_more_channels') }}
                </a>
            </p>
        </div>

        <div v-if="channel_add_display" class="kiwi-statebrowser-channels-info">
            <form
                class="kiwi-statebrowser-newchannel"
                @submit.prevent="submitNewChannelForm"
            >
                <div
                    v-focus
                    :class="[
                        channel_add_input_has_focus ?
                            'kiwi-statebrowser-newchannel-inputwrap--focus' :
                            ''
                    ]"
                    class="kiwi-statebrowser-newchannel-inputwrap"
                >
                    <input
                        v-model="channel_add_input"
                        :placeholder="$t('state_join')"
                        type="text"
                        @focus="onNewChannelInputFocus"
                        @blur="onNewChannelInputBlur"
                    >
                </div>
            </form>
        </div>

        <div :class="[
            collapsed ? 'kiwi-statebrowser-network-toggable-area--collapsed' : '',
        ]" class="kiwi-statebrowser-network-toggable-area"
        >
            <transition name="kiwi-statebrowser-network-status-transition">
                <div v-if="network.state !== 'connected'" class="kiwi-statebrowser-network-status">
                    <template v-if="network.state_error">
                        <i class="fa fa-exclamation-triangle" aria-hidden="true" />
                        <a class="u-link" @click="showNetworkSettings(network)">
                            {{ $t('state_configure') }}
                        </a>
                    </template>
                    <template v-else-if="!network.connection.server">
                        <a class="u-link" @click="showNetworkSettings(network)">
                            {{ $t('state_configure') }}
                        </a>
                    </template>
                    <template v-else-if="network.state === 'disconnected'">
                        {{ $t('state_disconnected') }}
                        <a class="u-link" @click="network.ircClient.connect()">
                            {{ $t('connect') }}
                        </a>
                    </template>
                    <template v-else-if="network.state === 'connecting'">
                        {{ $t('connecting') }}
                    </template>
                </div>
            </transition>

            <div class="kiwi-statebrowser-channels">
                <div
                    v-if="network.state === 'connected'"
                    class="kiwi-statebrowser-channels-options"
                >
                    <div
                        :class="{ active: channel_add_display == true }"
                        class="kiwi-statebrowser-channels-option"
                        @click="toggleAddChannel()"
                    >
                        <i class="fa fa-plus" aria-hidden="true" />
                    </div>
                    <div
                        :class="{ active: channel_filter_display == true }"
                        class="kiwi-statebrowser-channels-option"
                        @click="onSearchChannelClick"
                    >
                        <i class="fa fa-search" aria-hidden="true" />
                    </div>
                </div>

                <div
                    v-for="buffer in filteredBuffers"
                    :key="buffer.name"
                    :data-name="buffer.name.toLowerCase()"
                    :class="{
                        'kiwi-statebrowser-channel-active': isActiveBuffer(buffer),
                        'kiwi-statebrowser-channel-notjoined': buffer.isChannel() && !buffer.joined
                    }"
                    class="kiwi-statebrowser-channel"
                >
                    <div class="kiwi-statebrowser-channel-name" @click="setActiveBuffer(buffer)">
                        <away-status-indicator
                            v-if="buffer.isQuery() && awayNotifySupported()"
                            :network="network" :user="network.userByName(buffer.name)"
                        />{{ buffer.name }}
                    </div>
                    <div class="kiwi-statebrowser-buffer-actions">
                        <div class="kiwi-statebrowser-channel-labels">
                            <div
                                v-if="buffer.flags.unread && showMessageCounts(buffer)"
                                :class="[
                                    buffer.flags.highlight ?
                                        'kiwi-statebrowser-channel-label--highlight' :
                                        ''
                                ]"
                                class="kiwi-statebrowser-channel-label"
                            >
                                {{ buffer.flags.unread > 999 ? "999+": buffer.flags.unread }}
                            </div>
                        </div>

                        <div class="kiwi-statebrowser-channel-leave" @click="closeBuffer(buffer)">
                            <i class="fa fa-times" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import state from '@/libs/state';
import * as Misc from '@/helpers/Misc';
import * as bufferTools from '@/libs/bufferTools';
import BufferSettings from './BufferSettings';
import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        BufferSettings,
        AwayStatusIndicator,
    },
    props: ['network', 'sidebarState'],
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
    computed: {
        serverBuffer() {
            return this.network.serverBuffer();
        },
        isActiveNetwork: function isActiveNetwork() {
            return state.getActiveNetwork() === this.network;
        },
        totalNetworkCount() {
            return state.networks.length;
        },
        serverUnread() {
            if (!this.collapsed) {
                return this.serverBuffer.flags.unread;
            }
            let totalUnread = 0;
            this.network.buffers.forEach((buffer) => {
                if (buffer.isSpecial()) {
                    return;
                }
                totalUnread += buffer.flags.unread;
            });
            return totalUnread;
        },
        serverHighlight() {
            if (!this.collapsed) {
                return this.serverBuffer.flags.highlight;
            }
            let highlight = false;
            this.network.buffers.forEach((buffer) => {
                if (buffer.isSpecial()) {
                    return;
                }
                if (buffer.flags.highlight) {
                    highlight = true;
                }
            });
            return highlight;
        },
        filteredBuffers() {
            let filter = this.channel_filter;
            let filtered = [];

            if (!filter) {
                filtered = this.network.buffers;
            } else {
                filtered = _.filter(this.network.buffers, (buffer) => {
                    let name = buffer.name.toLowerCase();
                    return name.indexOf(filter) > -1;
                });
            }

            return bufferTools.orderBuffers(filtered);
        },
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
            bufferObjs.forEach((bufferObj) => {
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
            // Hacky, but if we remove the channel filter UI at this blur event and the user
            // clicked a link in this filter UI, then the click event will not hit the target
            // link as it has been removed before the event reaches it.
            setTimeout(() => {
                this.closeFilterChannel();
            }, 200);
        },
        closeBuffer(buffer) {
            state.removeBuffer(buffer);
        },
        awayNotifySupported() {
            return this.network.ircClient.network.cap.isEnabled('away-notify');
        },
        showMessageCounts: function showMessageCounts(buffer) {
            return !buffer.setting('hide_message_counts');
        },
        setActiveBuffer: function switchContainer(buffer) {
            // Clear any active component to show the buffer again
            state.$emit('active.component', null);
            state.setActiveBuffer(buffer.networkid, buffer.name);
            if (this.$state.ui.is_narrow) {
                state.$emit('statebrowser.hide');
            }
        },
        isActiveBuffer: function isActiveBuffer(buffer) {
            return (
                buffer.networkid === state.ui.active_network &&
                buffer.name === state.ui.active_buffer
            );
        },
        showNetworkSettings(network) {
            network.showServerBuffer('settings');
        },
        showNetworkChannels(network) {
            network.showServerBuffer('channels');
        },
        onSearchChannelClick() {
            // If we have no other buffers than the server buffer, take them straight
            // to the channel list for searching
            if (this.network.buffers.length > 1) {
                this.toggleFilterChannel();
            } else {
                this.network.showServerBuffer('channels');
            }
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
    box-sizing: border-box;
}

.kiwi-statebrowser-network-name {
    flex: 1;
    font-size: 1.1em;
    text-align: center;
    display: block;
    padding: 4px 0;
    box-sizing: border-box;
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

.kiwi-network-name-option {
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
    padding: 4px 4px 6px 4px;
    overflow: hidden;
    position: relative;
    height: 1.5em;
    font-size: 0.9em;
}

.kiwi-statebrowser-channels-options {
    text-align: left;
}

.kiwi-statebrowser-channels-option {
    display: inline-block;
    width: 35px;
    line-height: 35px;
    text-align: center;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s;
}

.kiwi-statebrowser-channels-option:hover {
    opacity: 1;
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
    border-left: 3px solid transparent;
}

.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-name {
    text-decoration: underline;
}

.kiwi-statebrowser-channel-name {
    cursor: pointer;
    flex: 1;
    word-break: break-all;
    transition: padding 0.1s, border 0.1s;
}

/* Contains the labels and close icons */
.kiwi-statebrowser-buffer-actions {
    flex: 0;
}

.kiwi-statebrowser-channel-labels {
    height: 100%;
    line-height: 1em;
    display: flex;
    box-sizing: border-box;
}

.kiwi-statebrowser-channel-label {
    padding: 0 10px;
    margin: 5px;
    font-weight: 600;
    border-radius: 4px;

    /* Vertical+horizontaly center align text */
    display: flex;
    text-align: center;
    align-items: center;
}

.kiwi-statebrowser-network-header .kiwi-statebrowser-channel-label {
    margin: 10px;
}

.kiwi-statebrowser-channel-leave {
    width: 38px; /* Visualy the same width as a single digit label */
    cursor: pointer;
    margin-right: 0;
    z-index: 10;
    display: none;
}

/* Hovering over the buffer name should show the close icon, but hide labels */
.kiwi-statebrowser-channel .kiwi-statebrowser-channel-labels,
.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-leave {
    /* display: inline-block; */
}

.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-leave {
    display: block;
}

.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-labels {
    display: none;
}

/* An active buffer should always show the close icon */
.kiwi-statebrowser-channel-active .kiwi-statebrowser-channel-leave {
    display: block;
}

.kiwi-statebrowser-channel-active .kiwi-statebrowser-channel-labels {
    display: none;
}

/* Add channel input */
.kiwi-statebrowser-newchannel-inputwrap {
    position: relative;
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
    .kiwi-network-name-options {
        right: 0;
        opacity: 1;
    }

    .kiwi-statebrowser-channel-name {
        line-height: 40px;
    }

    .kiwi-network-name-option {
        width: 50px;
    }

    .kiwi-statebrowser-channel-leave {
        opacity: 1;
        line-height: 40px;
        width: 50px;
    }

    .kiwi-statebrowser-channel-labels {
        right: 50px;
        top: 0;
    }

    .kiwi-statebrowser-channel-label {
        line-height: 41px;
        height: 40px;
    }

    /* Ensure that on mobile devices, when hovering this is visible */
    .kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-labels {
        opacity: 1;
    }
}

</style>
