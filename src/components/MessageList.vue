<template>
    <div class="kiwi-messagelist" @click="onThreadClick" @scroll.self="onThreadScroll">
        <div
            v-if="shouldShowChathistoryTools"
            class="kiwi-messagelist-scrollback"
        >
            <a @click="buffer.requestScrollback()" class="u-link">Load previous messages</a>
        </div>

        <div
            v-for="(message, idx) in filteredMessages"
            key="message.time"
            class="kiwi-messagelist-message"
            v-bind:class="[
                filteredMessages[idx-1] &&
                filteredMessages[idx-1].nick === message.nick &&
                message.time - filteredMessages[idx-1].time < 60000 &&
                message.type !== 'traffic' ?
                    'kiwi-messagelist-message-repeat' :
                    '',
                'kiwi-messagelist-message-' + message.type,
                message.type_extra ?
                    'kiwi-messagelist-message-' + message.type + '-' + message.type_extra :
                    '',
            ]"
        >
            <div
                v-if="bufferSetting('show_timestamps')"
                class="kiwi-messagelist-time"
            >
                {{formatTime(message.time)}}
            </div>
            <div
                class="kiwi-messagelist-nick"
                v-bind:style="nickStyle(message.nick)"
                v-bind:data-nick="message.nick"
            >
                {{message.nick}}
            </div>
            <div class="kiwi-messagelist-body" v-html="formatMessage(message.message)"></div>
        </div>

        <not-connected v-if="buffer.getNetwork().state !== 'connected'" :buffer="buffer"></not-connected>
    </div>
</template>

<script>

import strftime from 'strftime';
import state from 'src/libs/state';
import * as TextFormatting from 'src/helpers/TextFormatting';
import NotConnected from './NotConnected';

export default {
    components: {
        NotConnected,
    },
    data: function data() {
        return {
            auto_scroll: true,
            chathistoryAvailable: true,
        };
    },
    props: ['buffer', 'messages', 'users'],
    computed: {
        filteredMessages: function filteredMessages() {
            let list = [];
            let maxSize = this.buffer.setting('scrollback_size');
            let showJoinParts = this.buffer.setting('show_joinparts');
            for (let i = this.messages.length - 1; i >= 0 && list.length < maxSize; i--) {
                if (!showJoinParts && this.messages[i].type === 'traffic') {
                    continue;
                }
                list.push(this.messages[i]);
            }

            list.sort((a, b) => {
                if (a.time > b.time) {
                    return 1;
                } else if (b.time > a.time) {
                    return -1;
                }

                return 0;
            });

            return list;
        },
        usersAsObject: function usersAsObject() {
            return this.buffer.users.reduce((prev, cur) => {
                prev[cur] = true;
                return prev;
            }, {});
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
    },
    methods: {
        bufferSetting: function bufferSetting(key) {
            return this.buffer.setting(key);
        },
        formatTime: function formatTime(time) {
            return strftime(this.buffer.setting('timestamp_format') || '%T', new Date(time));
        },
        formatMessage: function formatMessage(messageBody) {
            let formatted = TextFormatting.ircCodesToHtml(messageBody);
            formatted = TextFormatting.linkifyChannels(formatted);
            formatted = TextFormatting.linkifyUrls(formatted, {
                addHandle: true,
                handleClass: 'fa fa-chevron-right kiwi-messagelist-message-linkhandle',
            });
            formatted = TextFormatting.linkifyUsers(formatted, this.usersAsObject);
            return formatted;
        },
        nickStyle: function nickColour(nick) {
            return 'color:' + TextFormatting.createNickColour(nick) + ';';
        },
        onThreadClick: function onThreadClick(event) {
            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName) {
                let network = this.buffer.getNetwork();
                state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
            }

            let userNick = event.target.getAttribute('data-nick');
            if (userNick) {
                // let buffer = state.addBuffer(this.buffer.networkid, userNick);
                // state.setActiveBuffer(buffer.networkid, buffer.name);
                let user = state.getUser(this.buffer.networkid, userNick);
                if (user) {
                    state.$emit('userbox.show', user, {
                        top: event.clientY,
                        left: event.clientX,
                    });
                }
            }

            let url = event.target.getAttribute('data-url');
            if (url) {
                state.$emit('mediaviewer.show', url);
            }
        },
        onThreadScroll: function onThreadScroll() {
            let el = this.$el;
            let scrolledUpByPx = el.scrollHeight - (el.offsetHeight + el.scrollTop);

            if (scrolledUpByPx > 30) {
                this.auto_scroll = false;
            } else {
                this.auto_scroll = true;
            }
        },
    },
    watch: {
        buffer: function watchBuffer(newBuffer) {
            if (!newBuffer) {
                return;
            }

            // First time opening this buffer, see if we can load any initial scrollback
            if (!newBuffer.flags.has_opened && this.shouldShowChathistoryTools) {
                newBuffer.requestScrollback();
            }

            if (this.buffer.getNetwork().state === 'connected') {
                newBuffer.flags.has_opened = true;
            }
        },
        messages: function watchMessages() {
            if (this.auto_scroll) {
                this.$nextTick(() => {
                    this.$el.scrollTop = this.$el.scrollHeight;
                });
            }
        },
    },
};
</script>

<style>
.kiwi-messagelist {
    overflow-y: auto;
}
.kiwi-messagelist-scrollback {
    text-align: center;
    padding: 5px;
}
.kiwi-messagelist-nick,
.kiwi-messagelist-time {
    display: inline-block;
}
.kiwi-messagelist-body {
    display: inline;
    white-space: pre-wrap;
    word-wrap: break-word;
}
.kiwi-messagelist-body a {
    word-break: break-all;
}
@media screen and (max-width: 500px) {
    .kiwi-messagelist-nick {
        display: inline;
        font-weight: bold;
        width: auto;
    }
    .kiwi-messagelist-body {
        display: block;
    }
    .kiwi-messagelist-time {
        float: right;
    }
    .kiwi-messagelist-message-repeat .kiwi-messagelist-nick {
        display: none;
    }
}
.kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}
</style>
