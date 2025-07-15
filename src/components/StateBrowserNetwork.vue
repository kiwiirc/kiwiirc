<template>
    <div
        :class="[
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

        <transition-expand>
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
                            @keydown="onNewChannelKeyDown"
                        >
                    </div>
                    <auto-complete
                        ref="autocomplete"
                        class="kiwi-statebrowser-newchannel-autocomplete"
                        items-per-page="5"
                        :items="suggestedChannelsList"
                        :filter="channel_add_input"
                        @click="onNewChannelClick"
                        @selected="onNewChannelSelected"
                    />
                </form>
            </div>
        </transition-expand>

        <div
            :class="[
                collapsed ? 'kiwi-statebrowser-network-toggable-area--collapsed' : '',
            ]" class="kiwi-statebrowser-network-toggable-area"
        >
            <transition-expand>
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
                <div
                    v-if="!showBufferGroups && !channel_filter_display && !channel_add_display"
                    class="kiwi-statebrowser-network-options"
                >
                    <div
                        :class="{ active: !!channel_add_display }"
                        class="kiwi-statebrowser-network-option"
                        @click="toggleAddChannel()"
                    >
                        <i class="fa fa-plus" aria-hidden="true" />
                    </div>
                    <div
                        :class="{ active: !!channel_filter_display }"
                        class="kiwi-statebrowser-network-option"
                        @click="onSearchChannelClick()"
                    >
                        <i class="fa fa-search" aria-hidden="true" />
                    </div>
                </div>
            </transition-expand>
            <div
                v-for="(itemBuffers, type) in filteredBuffersByType"
                :key="type"
                :data-name="type"
                class="kiwi-statebrowser-buffers"
            >
                <div
                    v-if="!channel_filter_display && showBufferGroups && type !== 'other'"
                    class="kiwi-statebrowser-channels-header"
                >
                    <div class="kiwi-statebrowser-buffertype" @click="toggleSection(type)">
                        <i
                            class="fa kiwi-statebrowser-channels-toggle"
                            :class="[
                                (show_channels && type === 'channels') ||
                                    (show_queries && type === 'queries') ?
                                        'fa-caret-down' :
                                        'fa-caret-right'
                            ]"
                        />
                        {{ type === 'channels' ? $t('channels') : $t('messages') }}
                    </div>

                    <div v-if="type === 'channels'" class="kiwi-statebrowser-channels-options">
                        <div
                            :class="{ active: !!channel_add_display }"
                            class="kiwi-statebrowser-channels-option"
                            @click="toggleAddChannel()"
                        >
                            <i class="fa fa-plus" aria-hidden="true" />
                        </div>
                        <div
                            :class="{ active: !!channel_filter_display }"
                            class="kiwi-statebrowser-channels-option"
                            @click="onSearchChannelClick()"
                        >
                            <i class="fa fa-search" aria-hidden="true" />
                        </div>
                    </div>
                    <div v-else-if="type === 'queries'" class="kiwi-statebrowser-channels-options">
                        <div
                            v-if="itemBuffers.length > 1"
                            class="kiwi-statebrowser-channels-option
                                kiwi-statebrowser-queries-close"
                            @click.stop.prevent="promptClose()"
                        >
                            <i class="fa fa-times" aria-hidden="true" />
                        </div>
                    </div>
                    <div class="kiwi-statebrowser-buffer-actions">
                        <div class="kiwi-statebrowser-channel-labels">
                            <div
                                v-if="!show_channels &&
                                    type === 'channels' &&
                                    channelActivity.unread > 0"

                                :class="[
                                    channelActivity.highlights ?
                                        'kiwi-statebrowser-channel-label--highlight' :
                                        ''
                                ]"
                                class="kiwi-statebrowser-channel-label"
                            >
                                {{ channelActivity.unread > 999 ?
                                    '999+' : channelActivity.unread }}
                            </div>
                            <div
                                v-else-if="!show_queries &&
                                    type === 'queries' &&
                                    queryActivity.unread > 0"

                                :class="[
                                    queryActivity.highlights ?
                                        'kiwi-statebrowser-channel-label--highlight' :
                                        ''
                                ]"
                                class="kiwi-statebrowser-channel-label"
                            >
                                {{ queryActivity.unread > 999 ?
                                    '999+' : queryActivity.unread }}
                            </div>
                        </div>
                    </div>
                </div>
                <transition-expand v-if="type === 'queries'">
                    <div v-if="showPromptClose" class="kiwi-statebrowser-prompt-close">
                        <span>{{ $t('prompt_close_queries') }}</span>
                        <input-confirm
                            :flip-connotation="true"
                            @ok="closeQueries(itemBuffers)"
                            @submit="promptClose()"
                        />
                    </div>
                </transition-expand>
                <transition-expand>
                    <div
                        v-if="itemBuffers.length && (
                            (show_channels && type === 'channels') ||
                            (show_queries && type === 'queries') ||
                            type === 'other'
                        )"
                        class="kiwi-statebrowser-buffers-container"
                    >
                        <buffer
                            v-for="buffer in itemBuffers"
                            :key="buffer.name"
                            :buffer="buffer"
                            :active-prompt="activePrompt"
                            @selected="setActiveBuffer(buffer)"
                        />
                    </div>
                </transition-expand>
            </div>
        </div>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as Misc from '@/helpers/Misc';
import * as bufferTools from '@/libs/bufferTools';
import AutoComplete from './AutoComplete';
import BufferSettings from './BufferSettings';
import StateBrowserBuffer from './StateBrowserBuffer';

export default {
    components: {
        AutoComplete,
        BufferSettings,
        Buffer: StateBrowserBuffer,
    },
    props: ['network', 'sidebarState', 'activePrompt'],
    data: function data() {
        return {
            collapsed: false,
            channel_filter: '',
            channel_filter_display: false,
            channel_add_display: false,
            channel_add_input_has_focus: false,
            channel_add_input: '',
            show_channels: true,
            show_queries: true,
        };
    },
    computed: {
        serverBuffer() {
            return this.network.serverBuffer();
        },
        isActiveNetwork: function isActiveNetwork() {
            return this.$state.getActiveNetwork() === this.network;
        },
        totalNetworkCount() {
            return this.$state.networks.length;
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
        filteredBuffersByType() {
            let types = {
                other: [],
                channels: [],
                queries: [],
            };

            this.filteredBuffers.forEach((bufferObj) => {
                if (bufferObj.isChannel()) {
                    types.channels.push(bufferObj);
                } else if (bufferObj.isQuery()) {
                    types.queries.push(bufferObj);
                } else {
                    // This is buffers like *raw, *bnc, *status etc
                    types.other.push(bufferObj);
                }
            });

            Object.entries(types).forEach(([type, buffers]) => {
                // Always show channels type as it has join controls
                if (type !== 'channels' && !buffers.length) {
                    delete types[type];
                }
            });

            return types;
        },
        suggestedChannelsList() {
            const networkid = this.network.id;

            const suggestedChannels = this.$state.setting('suggestedChannels');
            if (Array.isArray(suggestedChannels)) {
                return suggestedChannels
                    .filter((c) => !this.$state.getBufferByName(networkid, c.channel))
                    .map((c) => ({ text: c }));
            }

            if (this.network.channel_list_state === '') {
                this.network.maybeUpdateChannelList();
            }

            return this.network.channel_list
                .filter((c) => !this.$state.getBufferByName(networkid, c.channel))
                .sort((a, b) => b.num_users - a.num_users)
                .map((c) => ({ text: c.channel, count: c.num_users, type: 'channel' }));
        },
        channelActivity() {
            return this.activityFromBuffers(this.filteredBuffersByType.channels);
        },
        queryActivity() {
            return this.activityFromBuffers(this.filteredBuffersByType.queries);
        },
        showBufferGroups() {
            return this.$state.setting('buffers.show_buffer_groups');
        },
        showPromptClose() {
            return (this.activePrompt &&
                this.activePrompt.type === 'queries' &&
                this.activePrompt.value === this.network);
        },
    },
    methods: {
        activityFromBuffers(buffers) {
            let totalUnread = 0;
            let highlight = false;
            buffers.forEach((buffer) => {
                if (buffer.isSpecial() || buffer.setting('hide_message_counts')) {
                    return;
                }
                totalUnread += buffer.flags.unread;
                if (!highlight && buffer.flags.highlight) {
                    highlight = true;
                }
            });
            return {
                highlights: highlight,
                unread: totalUnread,
            };
        },
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

                let newBuffer = this.$state.addBuffer(network.id, chanName);
                if (newBuffer && !hasSwitchedActiveBuffer) {
                    this.$state.setActiveBuffer(network.id, newBuffer.name);
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
        showMessageCounts(buffer) {
            return !buffer.setting('hide_message_counts');
        },
        setActiveBuffer(buffer) {
            // Clear any active component to show the buffer again
            this.$state.$emit('active.component', null);
            this.$state.setActiveBuffer(buffer.networkid, buffer.name);
            if (this.$state.ui.is_narrow) {
                this.$state.$emit('statebrowser.hide');
            }
        },
        showNetworkSettings(network) {
            network.showServerBuffer('settings');
            if (this.$state.ui.is_narrow) {
                this.$state.$emit('statebrowser.hide');
            }
        },
        showNetworkChannels(network) {
            network.showServerBuffer('channels');
            if (this.$state.ui.is_narrow) {
                this.$state.$emit('statebrowser.hide');
            }
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
        toggleSection(type) {
            if (type === 'channels') {
                this.show_channels = !this.show_channels;
            } else if (type === 'queries') {
                this.show_queries = !this.show_queries;
            }
        },
        promptClose() {
            const prompt = this.activePrompt;
            if (this.showPromptClose) {
                // Prompt is currently visible so close it
                prompt.type = undefined;
                prompt.value = undefined;
            } else {
                prompt.type = 'queries';
                prompt.value = this.network;
            }
        },
        closeQueries(buffers) {
            buffers.forEach((buffer) => {
                this.$state.removeBuffer(buffer);
            });
        },
        closeFilterChannel() {
            this.channel_filter = '';
            this.channel_filter_display = false;
        },
        onNewChannelKeyDown(event) {
            if (!this.$refs.autocomplete) {
                return;
            }
            const autoComplete = this.$refs.autocomplete;

            if (event.key === 'Tab') {
                event.preventDefault();
                autoComplete.selectCurrentItem();
                return;
            }

            if (event.key === 'Escape') {
                this.channel_add_input = '';
                this.channel_add_display = false;
                return;
            }

            const item = autoComplete.selectedItem;
            if (event.key === 'Enter' && item && item.text === this.channel_add_input) {
                return;
            }

            this.$refs.autocomplete.handleOnKeyDown(event);
        },
        onNewChannelClick(value) {
            this.channel_add_input = value;
            this.submitNewChannelForm();
        },
        onNewChannelSelected(value) {
            this.channel_add_input = value;
        },
    },
};
</script>

<style lang="less">
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
    overflow-x: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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

.kiwi-statebrowser-network-options {
    line-height: 1em;
    text-align: right;
}

.kiwi-statebrowser-network-option {
    display: inline-block;
    width: 38px;
    line-height: 30px;
    text-align: center;
    cursor: pointer;
    opacity: 0.8;
    -webkit-transition: opacity 0.2s;
    transition: opacity 0.2s;
}

.kiwi-statebrowser-channels-header {
    line-height: 35px;
    display: flex;
    font-size: 0.8em;
    text-transform: uppercase;
    cursor: pointer;
}

.kiwi-statebrowser-channels-toggle {
    width: 10px;
    line-height: 35px;
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

.kiwi-statebrowser-channel {
    position: relative;
    display: flex;
    border-left: 3px solid transparent;
}

.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-name {
    text-decoration: underline;
}

.kiwi-statebrowser-channel-name,
.kiwi-statebrowser-buffertype {
    cursor: pointer;
    flex: 1;
    word-break: break-all;
    text-align: left;
    margin-left: 5px;
    user-select: none;
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

.kiwi-statebrowser-network-header .kiwi-statebrowser-buffer-actions {
    padding-right: 10px;
}

.kiwi-statebrowser-network-header .kiwi-statebrowser-channel-label {
    margin: 10px 0 10px 10px;
}

.kiwi-statebrowser-channel-leave {
    width: 38px; /* Visualy the same width as a single digit label */
    cursor: pointer;
    margin-right: 0;
    z-index: 10;
    display: none;
}

.kiwi-statebrowser-prompt-close,
.kiwi-statebrowser-prompt-close .u-input-confirm {
    padding-top: 6px;
    display: block;
}

/*
    Hovering over the buffer name should show the close icon, but hide labels
    An active buffer should always show the close icon
*/
.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-leave,
.kiwi-statebrowser-channel-active .kiwi-statebrowser-channel-leave {
    display: block;
}

.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-labels,
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

.kiwi-statebrowser-newchannel-autocomplete.kiwi-autocomplete {
    position: relative;
    text-align: left;
    background: initial;
    border: initial;
    box-shadow: initial;
}

.kiwi-statebrowser-newchannel-autocomplete {
    .kiwi-autocomplete-item {
        padding: 5px 11px;
        border-bottom: initial;
        white-space: nowrap;
    }

    .kiwi-autocomplete-item-value {
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

@supports not (grid-template-rows: subgrid) {
    .kiwi-statebrowser-newchannel-autocomplete {
        .kiwi-autocomplete-item {
            display: flex;
            gap: 10px;
        }

        .kiwi-autocomplete-item-value {
            flex-grow: 1;
        }

        .kiwi-autocomplete-item-count {
            flex-shrink: 0;
        }
    }
}

/* Channel search input */
.kiwi-statebrowser-channelfilter {
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
