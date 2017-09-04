<template>
    <!--
        The buffer.message_count key here forces the emssage list to re-render when a new message comes in.
        This way we don't need to have all the messages within vues reactive state to save CPU time.
    -->
    <div class="kiwi-messagelist" @scroll.self="onThreadScroll" @click.self="onListClick" :key="buffer.name">
        <div
            v-if="shouldShowChathistoryTools"
            class="kiwi-messagelist-scrollback"
        >
            <a @click="buffer.requestScrollback()" class="u-link">{{$t('messages_load')}}</a>
        </div>

        <message-list-message-modern
            v-if="listType === 'modern'"
            v-for="(message, idx) in filteredMessages()"
            :message="message"
            :idx="idx"
            :ml="thisMl"
            :key="message.id"
        ></message-list-message-modern>
        <message-list-message-compact
            v-if="listType !== 'modern'"
            v-for="(message, idx) in filteredMessages()"
            :message="message"
            :idx="idx"
            :ml="thisMl"
            :key="message.id"
        ></message-list-message-compact>
    </div>
</template>

<script>

import strftime from 'strftime';
import state from 'src/libs/state';
import * as TextFormatting from 'src/helpers/TextFormatting';
import NotConnected from './NotConnected';
import MessageListMessageCompact from './MessageListMessageCompact';
import MessageListMessageModern from './MessageListMessageModern';

// If we're scrolled up more than this many pixels, don't auto scroll down to the bottom
// of the message list
const BOTTOM_SCROLL_MARGIN = 30;

export default {
    components: {
        NotConnected,
        MessageListMessageModern,
        MessageListMessageCompact,
    },
    data: function data() {
        return {
            auto_scroll: true,
            chathistoryAvailable: true,
            hover_nick: '',
            message_info_open: null,
        };
    },
    props: ['buffer', 'users'],
    computed: {
        thisMl: function thisMl() {
            return this;
        },
        listType: function listType() {
            return state.setting('messageLayout');
        },
        useExtraFormatting: function useExtraFormatting() {
            // Enables simple markdown formatting
            return this.buffer.setting('extra_formatting');
        },
        shouldShowChathistoryTools: function shouldShowChathistoryTools() {
            // Only show it if we're connected
            if (this.buffer.getNetwork().state !== 'connected') {
                return false;
            }

            let isCorrectBufferType = (this.buffer.isChannel() || this.buffer.isQuery());
            let isSupported = !!this.buffer.getNetwork().ircClient.network.supports('chathistory');
            return isCorrectBufferType && isSupported && this.buffer.flags.chathistory_available;
        },
        ourNick: function ourNick() {
            return this.buffer ?
                this.buffer.getNetwork().nick :
                '';
        },
    },
    methods: {
        filteredMessages: function filteredMessages() {
            let network = this.buffer.getNetwork();
            let currentNick = network.nick;
            let bufferMessages = this.buffer.getMessages();

            // Hack; We need to make vue aware that we depend on buffer.message_count in order to
            // get the messagelist to update its DOM, as the change of message_count alerts
            // us that the messages have changed. This is done so that vue does not have to make
            // every emssage reactive which gets very expensive.
            /* eslint-disable no-unused-vars */
            let ignoredVar = this.buffer.message_count;

            let messages = bufferMessages.slice(0, bufferMessages.length);
            messages.sort((a, b) => {
                if (a.time > b.time) {
                    return 1;
                } else if (b.time > a.time) {
                    return -1;
                }

                return 0;
            });

            let list = [];
            let maxSize = this.buffer.setting('scrollback_size');
            let showJoinParts = this.buffer.setting('show_joinparts');
            for (let i = messages.length - 1; i >= 0 && list.length < maxSize; i--) {
                if (!showJoinParts && messages[i].type === 'traffic') {
                    continue;
                }
                // Ignored users have the ignore flag set
                if (messages[i].ignore) {
                    continue;
                }

                // When we join a channel the topic is usually sent next. But this looks
                // ugly when rendered. So we switch the topic + join messages around so
                // that the topic is first in the message list.
                if (
                    messages[i].type === 'topic' &&
                    messages[i - 1] &&
                    messages[i - 1].type === 'traffic' &&
                    messages[i - 1].nick === currentNick
                ) {
                    list.push(messages[i - 1]);
                    list.push(messages[i]);
                    i--;
                } else {
                    list.push(messages[i]);
                }
            }

            return list.reverse();
        },
        isHoveringOverMessage: function isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
        toggleMessageInfo: function toggleMessageInfo(message) {
            if (!message) {
                this.message_info_open = null;
            } else if (this.message_info_open === message) {
                return;
            } else if (this.canShowInfoForMessage(message)) {
                // If in the process of selecting text, don't show the info box
                let sel = window.getSelection();
                if (sel.rangeCount > 0) {
                    let range = sel.getRangeAt(0);
                    if (range && !range.collapsed) {
                        return;
                    }
                }

                this.message_info_open = message;
                this.$nextTick(this.maybeScrollToBottom.bind(this));
            }
        },
        canShowInfoForMessage: function canShowInfoForMessage(message) {
            let showInfoForTypes = ['privmsg', 'notice', 'action'];
            return showInfoForTypes.indexOf(message.type) > -1;
        },
        bufferSetting: function bufferSetting(key) {
            return this.buffer.setting(key);
        },
        formatTime: function formatTime(time) {
            return strftime(this.buffer.setting('timestamp_format') || '%T', new Date(time));
        },
        formatMessage: function formatMessage(message) {
            return message.parseHtml(this);
        },
        isMessageHighlight: function isMessageHighlight(message) {
            // Highlighting ourselves when we join or leave a channel is silly
            if (message.type === 'traffic') {
                return false;
            }

            let network = this.buffer.getNetwork();
            if (message.message.toLowerCase().indexOf(network.nick.toLowerCase()) > -1) {
                return true;
            }

            let highlightFound = false;
            (state.setting('highlights') || '').toLowerCase().split(' ').forEach(word => {
                if (!word) {
                    return;
                }

                if (message.message.indexOf(word) > -1) {
                    highlightFound = true;
                }
            });

            return highlightFound;
        },
        nickStyle: function nickColour(nick) {
            return 'color:' + TextFormatting.createNickColour(nick) + ';';
        },
        onListClick: function onListClick(event) {
            this.toggleMessageInfo();
        },
        onMessageClick: function onThreadClick(event, message) {
            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName) {
                let network = this.buffer.getNetwork();
                state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
                return;
            }

            let userNick = event.target.getAttribute('data-nick');
            if (userNick) {
                let user = state.getUser(this.buffer.networkid, userNick);
                if (user) {
                    state.$emit('userbox.show', user, {
                        top: event.clientY,
                        left: event.clientX,
                        buffer: this.buffer,
                    });
                }

                return;
            }

            let url = event.target.getAttribute('data-url');
            if (url) {
                state.$emit('mediaviewer.show', url);
            }

            if (this.message_info_open && this.message_info_open !== message) {
                // Clicking on another message while another info is open, just close the info
                this.toggleMessageInfo();
                event.preventDefault();
                return;
            }

            if (this.canShowInfoForMessage(message) && event.target.nodeName === 'A') {
                // Stop links from doing their thing. We show a preview and normal links for that
                event.preventDefault();
            }

            this.toggleMessageInfo(message);
        },
        onThreadScroll: function onThreadScroll() {
            let el = this.$el;
            let scrolledUpByPx = el.scrollHeight - (el.offsetHeight + el.scrollTop);

            if (scrolledUpByPx > BOTTOM_SCROLL_MARGIN) {
                this.auto_scroll = false;
            } else {
                this.auto_scroll = true;
            }
        },
        scrollToBottom: function scrollToBottom() {
            this.$el.scrollTop = this.$el.scrollHeight;
        },
        maybeScrollToBottom: function maybeScrollToBottom() {
            if (this.auto_scroll) {
                this.$el.scrollTop = this.$el.scrollHeight;
            }
        },
    },
    watch: {
        buffer: function watchBuffer(newBuffer) {
            if (!newBuffer) {
                return;
            }

            this.message_info_open = null;

            // First time opening this buffer, see if we can load any initial scrollback
            if (!newBuffer.flags.has_opened && this.shouldShowChathistoryTools) {
                newBuffer.requestScrollback();
            }

            if (this.buffer.getNetwork().state === 'connected') {
                newBuffer.flags.has_opened = true;
            }

            this.scrollToBottom();
        },
        'buffer.message_count': function watchBufferMessageCount() {
            this.$nextTick(() => {
                this.maybeScrollToBottom();
            });
        },
    },
    mounted: function mounted() {
        this.$nextTick(() => {
            this.scrollToBottom();
        });

        this.listen(state, 'mediaviewer.opened', () => {
            this.$nextTick(this.maybeScrollToBottom.apply(this));
        });
    },
};
</script>

<style>
.kiwi-messagelist {
    overflow-y: auto;
    height: 100%;
}
.kiwi-messagelist-scrollback {
    text-align: center;
    padding: 5px;
}
.kiwi-messagelist-message {
    overflow: hidden;
    transition: opacity 0.2s
}
.kiwi-messagelist-message--blur {
    opacity: 0.5;
}
.kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

</style>
