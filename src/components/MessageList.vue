<template>
    <div
        :key="buffer.name"
        class="kiwi-messagelist"
        @scroll.self="onThreadScroll"
        @click.self="onListClick"
    >
        <div
            v-if="shouldShowChathistoryTools"
            class="kiwi-messagelist-scrollback"
        >
            <a class="u-link" @click="buffer.requestScrollback()">
                {{ $t('messages_load') }}
            </a>
        </div>

        <div
            v-for="(message, idx) in filteredMessages"
            :key="message.id"
            :class="[
                'kiwi-messagelist-item',
                selectedMessages.has(message.id) ?
                    'kiwi-messagelist-item--selected' :
                    ''
            ]"
        >
            <div
                v-if="shouldShowDateChangeMarker(idx)"
                class="kiwi-messagelist-seperator"
            >
                <span>{{ (new Date(message.time)).toDateString() }}</span>
            </div>
            <div v-if="shouldShowUnreadMarker(idx)" class="kiwi-messagelist-seperator">
                <span>{{ $t('unread_messages') }}</span>
            </div>

            <!-- message.template is checked first for a custom component, then each message layout
                 checks for a message.bodyTemplate custom component to apply only to the body area
            -->
            <div
                v-if="message.render() && message.template && message.template.$el"
                v-rawElement="message.template.$el"
            />
            <message-list-message-modern
                v-else-if="listType === 'modern'"
                :message="message"
                :idx="idx"
                :ml="thisMl"
            />
            <message-list-message-inline
                v-else-if="listType === 'inline'"
                :message="message"
                :idx="idx"
                :ml="thisMl"
            />
            <message-list-message-compact
                v-else-if="listType === 'compact'"
                :message="message"
                :idx="idx"
                :ml="thisMl"
            />
        </div>

        <transition name="kiwi-messagelist-joinloadertrans">
            <div v-if="shouldShowJoiningLoader" class="kiwi-messagelist-joinloader">
                <LoadingAnimation />
            </div>
        </transition>

        <buffer-key
            v-if="shouldRequestChannelKey"
            :buffer="buffer"
            :network="buffer.getNetwork()"
        />

    </div>
</template>

<script>
'kiwi public';

import strftime from 'strftime';
import Logger from '@/libs/Logger';
import BufferKey from './BufferKey';
import MessageListMessageCompact from './MessageListMessageCompact';
import MessageListMessageModern from './MessageListMessageModern';
import MessageListMessageInline from './MessageListMessageInline';
import LoadingAnimation from './LoadingAnimation.vue';

require('@/libs/polyfill/Element.closest');

let log = Logger.namespace('MessageList.vue');

// If we're scrolled up more than this many pixels, don't auto scroll down to the bottom
// of the message list
const BOTTOM_SCROLL_MARGIN = 30;

export default {
    components: {
        BufferKey,
        MessageListMessageModern,
        MessageListMessageCompact,
        MessageListMessageInline,
        LoadingAnimation,
    },
    props: ['buffer'],
    data() {
        return {
            auto_scroll: true,
            chathistoryAvailable: true,
            hover_nick: '',
            message_info_open: null,
            timeToClose: false,
            startClosing: false,
            selectedMessages: new Set(),
        };
    },
    computed: {
        thisMl() {
            return this;
        },
        listType() {
            if (this.$state.setting('messageLayout')) {
                log.info('Deprecation Warning: The config option \'messageLayout\' has been moved to buffers.messageLayout');
            }
            return this.buffer.setting('messageLayout') || this.$state.setting('messageLayout');
        },
        useExtraFormatting() {
            // Enables simple markdown formatting
            return this.buffer.setting('extra_formatting');
        },
        shouldShowChathistoryTools() {
            // Only show it if we're connected
            if (this.buffer.getNetwork().state !== 'connected') {
                return false;
            }

            let isCorrectBufferType = (this.buffer.isChannel() || this.buffer.isQuery());
            let isSupported = !!this.buffer.getNetwork().ircClient.chathistory.isSupported();
            return isCorrectBufferType && isSupported && this.buffer.flags.chathistory_available;
        },
        shouldRequestChannelKey() {
            return this.buffer.getNetwork().state === 'connected' &&
                this.buffer.isChannel() &&
                this.buffer.flags.channel_badkey;
        },
        ourNick() {
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

                // Don't show the first connection message. Channels are only interested in
                // the joining message at first. Dis/connection messages are only relevant here
                // if the dis/connection happens between messages (during a conversation)
                if (messages[i].type === 'connection' && i === 0) {
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
        shouldShowJoiningLoader() {
            return this.buffer.isChannel() &&
                this.buffer.enabled &&
                !this.buffer.joined &&
                this.buffer.getNetwork().state === 'connected';
        },
    },
    watch: {
        buffer(newBuffer) {
            if (!newBuffer) {
                return;
            }

            this.message_info_open = null;

            if (this.buffer.getNetwork().state === 'connected') {
                newBuffer.flags.has_opened = true;
            }

            this.scrollToBottom();
        },
        'buffer.message_count'() {
            this.$nextTick(() => {
                this.maybeScrollToBottom();
            });
        },
    },
    mounted() {
        this.addCopyListeners();

        this.$nextTick(() => {
            this.scrollToBottom();
        });

        this.listen(this.$state, 'mediaviewer.opened', () => {
            this.$nextTick(this.maybeScrollToBottom.apply(this));
        });

        this.listen(this.$state, 'messagelist.scrollto', (opt) => {
            if (opt && opt.id) {
                this.maybeScrollToId(opt.id);
            }
        });
    },
    methods: {
        isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
        toggleMessageInfo(message) {
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
        canShowInfoForMessage(message) {
            let showInfoForTypes = ['privmsg', 'notice', 'action'];
            return showInfoForTypes.indexOf(message.type) > -1;
        },
        bufferSetting(key) {
            return this.buffer.setting(key);
        },
        formatTime(time) {
            return strftime(this.buffer.setting('timestamp_format') || '%T', new Date(time));
        },
        formatTimeFull(time) {
            let format = this.buffer.setting('timestamp_full_format');
            return format ?
                strftime(format, new Date(time)) :
                (new Date(time)).toLocaleString();
        },
        formatMessage(message) {
            return message.toHtml(this);
        },
        isMessageHighlight(message) {
            // Highlighting ourselves when we join or leave a channel is silly
            if (message.type === 'traffic') {
                return false;
            }

            return message.isHighlight;
        },
        userColour(user) {
            if (user && this.bufferSetting('colour_nicknames_in_messages')) {
                return user.getColour();
            }
            return '';
        },
        openUserBox(nick) {
            let user = this.$state.getUser(this.buffer.networkid, nick);
            if (user) {
                this.$state.$emit('userbox.show', user, {
                    buffer: this.buffer,
                });
            }
        },
        onListClick(event) {
            this.toggleMessageInfo();
        },
        onMessageDblClick(event, message) {
            clearTimeout(this.messageClickTmr);

            let userNick = event.target.getAttribute('data-nick');
            if (userNick) {
                this.$state.$emit('input.insertnick', userNick);
            }
        },
        onMessageClick(event, message, delay) {
            // Delaying the click for 200ms allows us to check for a second click. ie. double click
            // Quick hack as we only need double click for nicks, nothing else
            if (delay && event.target.getAttribute('data-nick')) {
                clearTimeout(this.messageClickTmr);
                this.messageClickTmr = setTimeout(this.onMessageClick, 200, event, message, false);
                return;
            }

            let isLink = event.target.tagName === 'A';

            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName && isLink) {
                let network = this.buffer.getNetwork();
                this.$state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
                this.$state.setActiveBuffer(this.buffer.networkid, channelName);
                return;
            }

            let userNick = event.target.getAttribute('data-nick');
            if (userNick && isLink) {
                this.openUserBox(userNick);
                return;
            }

            let url = event.target.getAttribute('data-url');
            if (url && isLink) {
                if (this.$state.setting('buffers.inline_link_previews')) {
                    message.embed.type = 'url';
                    message.embed.payload = url;
                } else {
                    this.$state.$emit('mediaviewer.show', url);
                }
            }

            if (this.message_info_open && this.message_info_open !== message) {
                // Clicking on another message while another info is open, just close the info
                this.toggleMessageInfo();
                event.preventDefault();
                return;
            }

            if (this.$state.ui.is_touch && this.$state.setting('buffers.show_message_info')) {
                if (this.canShowInfoForMessage(message) && event.target.nodeName === 'A') {
                    // We show message info boxes on touch screen devices so that the user has an
                    // option to preview the links or do other stuff.
                    event.preventDefault();
                }

                this.toggleMessageInfo(message);
            }
        },
        onThreadScroll() {
            let el = this.$el;
            let scrolledUpByPx = el.scrollHeight - (el.offsetHeight + el.scrollTop);

            if (scrolledUpByPx > BOTTOM_SCROLL_MARGIN) {
                this.auto_scroll = false;
            } else {
                this.auto_scroll = true;
            }
        },
        scrollToBottom() {
            this.$el.scrollTop = this.$el.scrollHeight;
        },
        maybeScrollToBottom() {
            if (this.auto_scroll) {
                this.$el.scrollTop = this.$el.scrollHeight;
            }
        },
        maybeScrollToId(id) {
            let messageElement = this.$el.querySelector('.kiwi-messagelist-message[data-message-id="' + id + '"]');
            if (messageElement && messageElement.offsetTop) {
                this.$el.scrollTop = messageElement.offsetTop;
                this.auto_scroll = false;
            }
        },
        restrictTextSelection() { // Prevents the selection cursor escaping the message list.
            document.querySelector('body').classList.add('kiwi-unselectable');
            this.$el.style.userSelect = 'text';
        },
        unrestrictTextSelection() { // Allows all page elements to be selected again.
            document.querySelector('body').classList.remove('kiwi-unselectable');
            this.$el.style.userSelect = 'auto';
        },
        removeSelections(removeNative = false) {
            this.selectedMessages = new Set();

            let selection = document.getSelection();
            if (removeNative && selection) {
                // stops the native browser selection being left behind after ctrl+c
                selection.removeAllRanges();
            }
        },
        addCopyListeners() { // Better copy pasting
            const LogFormatter = (msg) => {
                let text = '';

                switch (msg.type) {
                case 'privmsg':
                    text = `<${msg.nick}> ${msg.message}`;
                    break;
                case 'nick':
                case 'mode':
                case 'action':
                case 'traffic':
                    text = `${msg.message}`;
                    break;
                default:
                    text = msg.message;
                }
                if (text.length) {
                    return `[${(new Date(msg.time)).toLocaleTimeString({ hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${text}`;
                }
                return null;
            };

            let copyData = '';
            let selecting = false;

            this.listen(document, 'mouseup', (e) => {
                this.unrestrictTextSelection();
                if (selecting) {
                    e.preventDefault();
                }
                selecting = false;
            });

            this.listen(document, 'selectionchange', (e) => {
                if (!this.$el) {
                    return true;
                }

                copyData = ''; // Store the text data to be copied in this.

                let selection = document.getSelection();

                if (!selection
                || !selection.anchorNode
                || !selection.anchorNode.parentNode.closest('.' + this.$el.className)) {
                    this.unrestrictTextSelection();
                    this.removeSelections();
                    return true;
                }

                this.removeSelections();
                // Prevent the selection escaping the message list
                this.restrictTextSelection();
                if (selection.rangeCount > 0) {
                    selecting = true;
                    let firstRange = selection.getRangeAt(0);
                    let lastRange = selection.getRangeAt(selection.rangeCount - 1);
                    // Traverse the DOM to find messages in selection
                    let startNode = firstRange.startContainer.parentNode.closest('[data-message-id]');
                    let endNode = lastRange.endContainer.parentNode.closest('[data-message-id]');
                    if (!endNode) {
                        // If endContainer isn't in messagelist then mouse has been dragged outside
                        // Set the end node to last in the message list
                        endNode = this.$el.querySelector('.kiwi-messagelist-item:last-child');
                    }
                    if (!startNode || !endNode || startNode === endNode) {
                        return true;
                    }

                    let node = startNode;
                    let messages = [];
                    let allMessages = this.buffer.getMessages();

                    const finder = (m) => m.id.toString() === node.attributes['data-message-id'].value;

                    let i = 0;
                    while (node) {
                        // This could be more efficent with an id->msg lookup
                        let msg = allMessages.find(finder);

                        // Add to a list of selected messages
                        this.selectedMessages.add(msg.id);
                        if (msg) {
                            messages.push(msg);
                        }
                        if (node === endNode) {
                            node = null;
                        } else {
                            let nextNode = node.closest('[data-message-id]').parentNode.nextElementSibling;
                            node = nextNode && nextNode.querySelector('[data-message-id]');
                        }
                    }
                    // Replace the set so the MessageList updates.
                    this.selectedMessages = new Set(this.selectedMessages);

                    // Iterate through the selected messages, format and store as a
                    // string to be used in the copy handler
                    copyData = messages
                        .sort((a, b) => (a.time > b.time ? 1 : -1))
                        .filter((m) => m.message.trim().length)
                        .map(LogFormatter)
                        .join('\r\n');
                } else {
                    this.unrestrictTextSelection();
                }
                return false;
            });

            this.listen(document, 'copy', (e) => {
                if (!copyData || !copyData.length) { // Just do a normal copy if no special data
                    return true;
                }

                if (navigator.clipboard) { // Supports Clipboard API
                    navigator.clipboard.writeText(copyData);
                } else {
                    let input = document.createElement('textarea');
                    document.body.appendChild(input);
                    input.innerHTML = copyData;
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                }
                this.removeSelections(true);
                return true;
            });
        },
        // Move a messages embeded content to the main media preview
        openEmbedInPreview(message) {
            // First open the embed in the main media preview
            let embed = message.embed;
            if (embed.type === 'url') {
                this.$state.$emit('mediaviewer.show', embed.payload);
            } else if (embed.type === 'component') {
                this.$state.$emit('mediaviewer.show', {
                    component: embed.payload,
                });
            }

            // Remove the embed from the message
            embed.payload = null;
        },
    },
};
</script>

<style lang="less">

.kiwi-unselectable * {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

div.kiwi-messagelist-item.kiwi-messagelist-item--selected {
    border-left: 7px solid var(--brand-primary);
}

div.kiwi-messagelist-item.kiwi-messagelist-item--selected .kiwi-messagelist-message {
    border-left-width: 0;
}

.kiwi-messagelist-item.kiwi-messagelist-item--selected .kiwi-messagelist-message *::selection {
    background-color: unset;
    color: unset;
}

.kiwi-unselectable .kiwi-messagelist-scrollback {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.kiwi-messagelist {
    overflow-y: auto;
    box-sizing: border-box;
    margin-bottom: 25px;
    position: relative;
}

.kiwi-messagelist * {
    user-select: text;
}

.kiwi-messagelist::-webkit-scrollbar-track {
    border-radius: 10px;
    background: transparent;
}

.kiwi-messagelist::-webkit-scrollbar {
    width: 8px;
    background: transparent;
}

.kiwi-messagelist::-webkit-scrollbar-thumb {
    border-radius: 3px;
}

.kiwi-messagelist-item {
    /* Allow child elements to make use of margins+padding within messagelist items */
    overflow: hidden;
}

.kiwi-messagelist-message {
    padding: 0 10px;

    /* some message highlights add a left border so add a default invisble one in preperation */
    border-left: 3px solid transparent;
    overflow: hidden;
    line-height: 1.5em;
    margin: 0;
}

.kiwi-wrap--monospace .kiwi-messagelist-message {
    font-family: Consolas, monaco, monospace;
    font-size: 80%;
}

.kiwi-messagelist-message-mode,
.kiwi-messagelist-message-traffic {
    padding-top: 5px;
    padding-bottom: 5px;
}

/* Start of the not connected message styling */
.kiwi-messagelist-message-connection {
    padding: 0;
    text-align: center;
    font-weight: bold;
    border: none;
    margin: 0;
    background: none;
}

.kiwi-messagelist-message-connection .kiwi-messagelist-body {
    font-size: 1.2em;
    height: auto;
    line-height: normal;
    text-align: center;
    cursor: default;
    display: inline-block;
    padding: 0.5em 1em;
    margin: 1em auto 1em auto;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.kiwi-messagelist-message-connection .kiwi-messagelist-time,
.kiwi-messagelist-message-connection .kiwi-messagelist-nick {
    display: none;
}

/* Remove the styling for none user messages, as they make the page look bloated */
.kiwi-messagelist-message-mode,
.kiwi-messagelist-message-traffic,
.kiwi-messagelist-message-connection {
    min-height: 0;
    line-height: normal;
    text-align: left;
}

/* Remove the min height from the message, as again, makes the page look bloated */
.kiwi-messagelist-body {
    min-height: 0;
    text-align: left;
    line-height: 1.5em;
    font-size: 1.05em;
    margin: 0;
    padding: 0;
}

/* Channel messages - e.g 'server on #testing22 ' message and such */
.kiwi-messagelist-message-mode,
.kiwi-messagelist-message-traffic,
.kiwi-messagelist-message-nick {
    margin: 10px 0;
    opacity: 0.85;
    text-align: center;
    border: none;

    &:hover {
        opacity: 1;
    }
}

/* Absolute position the time on these messages so it's not above the message, it looks awful */
.kiwi-messagelist-message-mode .kiwi-messagelist-time,
.kiwi-messagelist-message-traffic .kiwi-messagelist-time {
    position: absolute;
    top: 1px;
    right: 10px;
}

.kiwi-messagelist-message--authorrepeat {
    border-top: none;
}

.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-nick,
.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-time {
    /* Setting the opacity instead visible:none ensures it's still selectable when copying text */
    opacity: 0;
    cursor: default;
}

.kiwi-container--sidebar-drawn .kiwi-messagelist::after {
    content: '';
    z-index: 3;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
    position: fixed;
    pointer-events: none;
}

.kiwi-container--sidebar-drawn.kiwi-container--no-sidebar .kiwi-messagelist::after {
    width: 0;
    height: 0;
    display: none;
    pointer-events: inherit;
    position: static;
    z-index: 0;
}

.kiwi-messagelist-scrollback {
    text-align: center;
    padding: 5px;
}

.kiwi-messagelist-seperator + .kiwi-messagelist-message {
    border-top: none;
}

.kiwi-messagelist-message--blur {
    opacity: 0.3;
}

.kiwi-messagelist-nick {
    text-align: right;
    font-weight: bold;
    text-overflow: ellipsis;
    overflow: hidden;
    vertical-align: top;
    cursor: pointer;
    padding: 2px 4px;
    word-break: break-all;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-seperator {
    text-align: center;
    display: block;
    margin: 1em 0 0.5em 0;
}

.kiwi-messagelist-seperator > span {
    display: inline-block;
    position: relative;
    z-index: 1;
    padding: 0 1em;
    top: -0.89em;
}

.kiwi-messagelist-seperator::after {
    content: "";
    display: block;
    position: relative;
    top: -0.8em;
}

/** Displaying an emoji in a message */
.kiwi-messagelist-emoji {
    width: 1.3em;
    display: inline-block;
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
.kiwi-messagelist-body .kiwi-nick {
    cursor: pointer;
}

.kiwi-messagelist-nick:hover {
    overflow: visible;
    width: auto;
}

/* Topic changes */
.kiwi-messagelist-message-topic {
    border-radius: 5px;
    margin: 18px;
    margin-left: 0;
    padding: 5px;
    text-align: center;
    position: relative;
    min-height: 0;
    display: block;
}

.kiwi-messagelist-message-topic .kiwi-messagelist-body {
    min-height: 0;
    margin: 0;

    &::before {
        display: none;
    }
}

.kiwi-messagelist-message-topic.kiwi-messagelist-message-topic .kiwi-messagelist-time {
    display: none;
}

.kiwi-messagelist-message-topic.kiwi-messagelist-message-topic .kiwi-messagelist-nick {
    display: none;
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

.kiwi-messagelist-message-action.kiwi-messagelist-message-action .kiwi-messagelist-nick {
    display: none;
}

/* MOTD */
.kiwi-messagelist-message-motd {
    font-family: monospace;
}

.kiwi-messagelist-message.kiwi-messagelist-message--hover,
.kiwi-messagelist-message.kiwi-messagelist-message--highlight,
.kiwi-messagelist-message.kiwi-messagelist-message-traffic--hover {
    position: relative;
}

/* Links */
.kiwi-messagelist-message-linkhandle {
    margin-left: 4px;
    font-size: 0.8em;
}

.kiwi-wrap--touch .kiwi-messagelist-message-linkhandle {
    display: none;
}

.kiwi-messagelist-joinloader {
    margin: 1em auto;
    width: 100px;

    /* the magic number below is the exact ratio of the kiwi logo height/width */
    height: calc (100px * 0.85987261146496815286624203821656);
    overflow: hidden;
}

.kiwi-messagelist-joinloadertrans-enter,
.kiwi-messagelist-joinloadertrans-leave-to {
    height: 0;
    opacity: 0;
}

.kiwi-messagelist-joinloadertrans-enter-to,
.kiwi-messagelist-joinloadertrans-leave {
    height: 150px;
    opacity: 1;
}

.kiwi-messagelist-joinloadertrans-enter-active,
.kiwi-messagelist-joinloadertrans-leave-active {
    transition: height 0.5s, opacity 0.5s;
}

@media screen and (max-width: 700px) {
    .kiwi-messagelist-message,
    .kiwi-messageinfo {
        margin: 0;
    }
}

</style>
