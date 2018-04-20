<template>
    <div class="kiwi-messagelist" @scroll.self="onThreadScroll" @click.self="onListClick" :key="buffer.name">
        <div
            v-if="shouldShowChathistoryTools"
            class="kiwi-messagelist-scrollback"
        >
            <a @click="buffer.requestScrollback()" class="u-link">{{$t('messages_load')}}</a>
        </div>

        <template v-for="(message, idx) in filteredMessages">
            <div v-if="shouldShowDateChangeMarker(idx)" class="kiwi-messagelist-seperator">
                <span>{{(new Date(message.time)).toDateString()}}</span>
            </div>
            <div v-if="shouldShowUnreadMarker(idx)" class="kiwi-messagelist-seperator">
                <span>{{$t('unread_messages')}}</span>
            </div>

            <component v-if="message.render() && message.template" v-bind:is="message.template" :message="message" :buffer="buffer"></component>
            <message-list-message-modern
                v-else-if="listType === 'modern'"
                :message="message"
                :idx="idx"
                :ml="thisMl"
                :key="message.id"
            ></message-list-message-modern>
            <message-list-message-compact
                v-else-if="listType !== 'modern'"
                :message="message"
                :idx="idx"
                :ml="thisMl"
                :key="message.id"
            ></message-list-message-compact>
        </template>

        <not-connected
            v-if="buffer.getNetwork().state !== 'connected'"
            :buffer="buffer"
            :network="buffer.getNetwork()"
        ></not-connected>
    </div>
</template>

<script>

import strftime from 'strftime';
import state from '@/libs/state';
import * as TextFormatting from '@/helpers/TextFormatting';
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
        filteredMessages() {
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
            let showTopics = this.buffer.setting('show_topics');
            let showNickChanges = this.buffer.setting('show_nick_changes');
            let showModeChanges = this.buffer.setting('show_mode_changes');
            for (let i = messages.length - 1; i >= 0 && list.length < maxSize; i--) {
                if (!showJoinParts && messages[i].type === 'traffic') {
                    continue;
                }
                if (!showTopics && messages[i].type === 'topic') {
                    continue;
                }
                if (!showNickChanges && messages[i].type === 'nick') {
                    continue;
                }
                if (!showModeChanges && messages[i].type === 'mode') {
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
    },
    methods: {
        isHoveringOverMessage: function isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
        toggleMessageInfo: function toggleMessageInfo(message) {
            if (!message) {
                this.message_info_open = null;
            } else if (this.message_info_open === message) {
                // It's already open, so don't do anything
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
        shouldShowUnreadMarker(idx) {
            let previous = this.filteredMessages[idx - 1];
            let current = this.filteredMessages[idx];
            let lastRead = this.buffer.last_read;

            if (!lastRead) {
                return false;
            }

            // If the last message has been read, and this message not read
            if (previous && previous.time < lastRead && current.time > lastRead) {
                return true;
            }

            return false;
        },
        shouldShowDateChangeMarker(idx) {
            let previous = this.filteredMessages[idx - 1];
            let current = this.filteredMessages[idx];

            if (!previous) {
                return false;
            }

            // If the last message has been read, and this message not read
            if ((new Date(previous.time)).getDay() !== (new Date(current.time)).getDay()) {
                return true;
            }

            return false;
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
            return message.toHtml(this);
        },
        isMessageHighlight: function isMessageHighlight(message) {
            // Highlighting ourselves when we join or leave a channel is silly
            if (message.type === 'traffic') {
                return false;
            }

            return message.isHighlight;
        },
        nickStyle: function nickColour(nick) {
            if (this.bufferSetting('colour_nicknames_in_messages')) {
                return 'color:' + TextFormatting.createNickColour(nick) + ';';
            }
            return '';
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

            if (state.ui.is_touch) {
                if (this.canShowInfoForMessage(message) && event.target.nodeName === 'A') {
                    // We show message info boxes on touch screen devices so that the user has an
                    // option to preview the links or do other stuff.
                    event.preventDefault();
                }

                this.toggleMessageInfo(message);
            }
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
    transition: opacity 0.2s;
    line-height: 1.5em;
    margin: 0 3px;
}

@media screen and (max-width: 700px) {
    .kiwi-messagelist-message,
    .kiwi-messageinfo {
        margin: 0;
    }
}

.kiwi-messagelist-message--blur {
    opacity: 0.5;
}

.kiwi-messagelist-nick {
    text-align: right;
    font-weight: bold;
    text-overflow: ellipsis;
    overflow: hidden;
    vertical-align: top;
    cursor: pointer;
    padding: 2px 4px;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-seperator {
    text-align: center;
    display: block;
    margin: 1em;
}

.kiwi-messagelist-seperator > span {
    background: #fff;
    display: inline-block;
    position: relative;
    z-index: 2;
    padding: 0 1em;
}

.kiwi-messagelist-seperator::after {
    content: "";
    display: block;
    border-bottom: 1px solid blue;
    position: relative;
    top: -0.8em;
}

/** Displaying an emoji in a message */
.kiwi-messagelist-emoji {
    width: 1.3em;
    display: inline-block;
    pointer-events: none;
    vertical-align: middle;
}

@keyframes emojiIn {
    0% {
        transform: scale(0);
    }

    100% {
        transform: scale(1);
    }
}

.kiwi-messagelist-emoji--single {
    animation: 0.1s ease-in-out 0s 1 emojiIn;
    font-size: 2em;
}

/** Message structure */
.kiwi-messagelist-time,
.kiwi-messagelist-body {
    padding: 2px 4px;
}

.kiwi-messagelist-time {
    font-size: 0.8em;
}

.kiwi-messagelist-nick:hover {
    overflow: visible;
}

.kiwi-messagelist-body {
    line-height: 1.5em;
}

.kiwi-messagelist-body .kiwi-nick {
    cursor: pointer;
}

/* Topic changes */
.kiwi-messagelist-message-topic {
    margin: 18px;
    padding: 5px;
    text-align: center;
}

.kiwi-messagelist-message-topic.kiwi-messagelist-message-topic .kiwi-messagelist-time {
    display: none;
}

.kiwi-messagelist-message-topic.kiwi-messagelist-message-topic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-message-topic .kiwi-messagelist-body {
    margin-left: 0;
}

/* Actions */
.kiwi-messagelist-message-action .kiwi-messagelist-message-body {
    font-style: italic;
}

/* Traffic (joins, parts, quits, kicks) */
.kiwi-messagelist-message-traffic.kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
    font-style: italic;
}

.kiwi-messagelist-message-action .kiwi-messagelist-body {
    font-style: italic;
}

.kiwi-messagelist-message-action.kiwi-messagelist-message-action .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-message-connection {
    text-align: center;
    font-weight: bold;
}

.kiwi-messagelist-message-connection-connected {
    color: green;
}

.kiwi-messagelist-message-connection-disconnected {
    color: red;
}

/* MOTD */
.kiwi-messagelist-message-motd {
    font-family: monospace;
}

/* Links */
.kiwi-messagelist-message-linkhandle {
    margin-left: 4px;
    font-size: 0.8em;
}

.kiwi-wrap--touch .kiwi-messagelist-message-linkhandle {
    display: none;
}

.kiwi-messagelist-message--modern {
    margin: 0 20px;
    margin-left: 10px;
    padding: 10px;
}
</style>
