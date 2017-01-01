<template>
    <div class="kiwi-messagelist" @click="onThreadClick" @scroll.self="onThreadScroll">
        <div
            v-for="(message, idx) in filteredMessages"
            :key="message.time"
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
            <div class="kiwi-messagelist-time">{{formatTime(message.time)}}</div>
            <div class="kiwi-messagelist-nick" v-bind:style="nickStyle(message.nick)">{{message.nick}}</div>
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

            return list.reverse();
        },
    },
    methods: {
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
            formatted = TextFormatting.linkifyUsers(formatted, this.users);
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
                let buffer = state.addBuffer(this.buffer.networkid, userNick);
                state.setActiveBuffer(buffer.networkid, buffer.name);
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
