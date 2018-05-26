<template>
    <div
        @click="ml.onMessageClick($event, message)"
        class="kiwi-messagelist-message kiwi-messagelist-message--text"
        v-bind:class="[
            ml.filteredMessages[idx-1] &&
            ml.filteredMessages[idx-1].nick === message.nick &&
            message.time - ml.filteredMessages[idx-1].time < 60000 &&
            ml.filteredMessages[idx-1].type !== 'traffic' &&
            message.type !== 'traffic' ?
                '' :
                '',
            'kiwi-messagelist-message-' + message.type,
            message.type_extra ?
                'kiwi-messagelist-message-' + message.type + '-' + message.type_extra :
                '',
            ml.isMessageHighlight(message) ?
                'kiwi-messagelist-message--highlight' :
                '',
            ml.isHoveringOverMessage(message) ?
                'kiwi-messagelist-message--hover' :
                '',
            ml.buffer.last_read && message.time > ml.buffer.last_read ?
                'kiwi-messagelist-message--unread' :
                '',
            message.nick.toLowerCase() === ml.ourNick.toLowerCase() ?
                'kiwi-messagelist-message--own' :
                '',
            ml.message_info_open === message ?
                'kiwi-messagelist-message--info-open' :
                '',
            ml.message_info_open && ml.message_info_open !== message ?
                'kiwi-messagelist-message--blur' :
                '',
        ]"
        :data-message="message"
        :data-nick="(message.nick||'').toLowerCase()"
    >
    <div class="kiwi-messagelist-body">
        <span
            v-if="ml.bufferSetting('show_timestamps')"
            class="kiwi-messagelist-time"
        >
            {{ml.formatTime(message.time)}}
        </span>
        <span
            class="kiwi-messagelist-nick"
            v-bind:style="ml.nickStyle(message.nick)"
            v-bind:data-nick="message.nick"
            @mouseover="ml.hover_nick=message.nick.toLowerCase();"
            @mouseout="ml.hover_nick='';"
        >
            {{message.user ? userModePrefix(message.user) : ''}}{{message.nick}}
        </span>
        <span v-html="ml.formatMessage(message)"></span>
    </div>

        <message-info
            v-if="ml.message_info_open===message"
            :message="message"
            :buffer="ml.buffer"
            @close="ml.toggleMessageInfo()"
        />
    </div>
</template>

<script>

// import state from '@/libs/state';
import * as Misc from '@/helpers/Misc';
import MessageInfo from './MessageInfo';

export default {
    components: {
        MessageInfo,
    },
    data: function data() {
        return {
        };
    },
    props: ['ml', 'message', 'idx'],
    computed: {
    },
    methods: {
        isHoveringOverMessage: function isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
        userModePrefix: function userModePrefix(user) {
            return Misc.userModePrefix(user, this.ml.buffer);
        },
    },
};
</script>

<style lang="less">

.kiwi-messagelist-message--text {
    position: relative;
}

.kiwi-messagelist-message--text .kiwi-messagelist-time {
    display: inline-block;
}

.kiwi-messagelist-message--text .kiwi-messagelist-nick {
    display: inline-block;
    min-width: none;
    text-align: left;
    max-width: 110px;
    overflow: hidden;
    margin-right: 2px;
}

//Add an ':' after the user's username
.kiwi-messagelist-message--text .kiwi-messagelist-nick::after {
    content: ":";
}

.kiwi-messagelist-message--text .kiwi-messagelist-nick:hover {
    max-width: none;
    width: auto;
}

.kiwi-messagelist-message--text .kiwi-messagelist-body {
    display: block;
    width: 100%;
    padding: 0;
}

.kiwi-messagelist-message--text .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-traffic {
    padding: 0 20px 0 12px;
    margin: 0;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-traffic .kiwi-messagelist-time {
    position: static;
    display: inline-block;
    top: auto;
    right: auto;
    margin-right: 10px;
}

.kiwi-messagelist-message--text .kiwi-messagelist-message-privmsg:hover,
.kiwi-messagelist-message--text .kiwi-messagelist-message-action:hover,
.kiwi-messagelist-message--text .kiwi-messagelist-message-notice:hover, {
    cursor: pointer;
}

//Channel Connection's
.kiwi-messagelist-message--text.kiwi-messagelist-message-connection {
    text-align: center;
    padding: 0;
    margin: 0;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-connection .kiwi-messagelist-body {
    display: inline-block;
    padding: 5px 0;
    margin: 0;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-connection .kiwi-messagelist-time {
    display: none;
}

//Channel topic
.kiwi-messagelist-message--text.kiwi-messagelist-message-topic {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    margin: 0;
    padding: 0;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-topic .kiwi-messagelist-body {
    padding-right: 0;
    max-width: 95%;
    margin-left: 20px;
}

// Traffic messages have an opacity lower than 1, so we do a blanket statment to make sure all messages are opacity: 1, rather than just specifying one.
.kiwi-messagelist-message--text.kiwi-messagelist-message--unread {
    opacity: 1;
}

.kiwi-messagelist-message--text .kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-item:last-of-type {
    margin-bottom: 5px;
}

//Nickname change fixes
.kiwi-messagelist-message--text.kiwi-messagelist-message-nick {
    margin: 0;
    padding: 0;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-nick .kiwi-messagelist-body {
    padding: 0 20px 0 15px;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-nick .kiwi-messagelist-nick {
    display: none;
}

@media screen and (max-width: 700px) {
    .kiwi-messagelist-message--text.kiwi-messagelist-message-traffic,
    .kiwi-messagelist-message--text.kiwi-messagelist-message-nick .kiwi-messagelist-body,
    .kiwi-messagelist-message--text .kiwi-messagelist-body {
        padding-right: 0;
    }
}

</style>
