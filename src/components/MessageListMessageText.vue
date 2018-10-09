<template>
    <div
        :class="[
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
        class="kiwi-messagelist-message kiwi-messagelist-message--text"
        @click="ml.onMessageClick($event, message)"
    >
        <div class="kiwi-messagelist-body">
            <span
                v-if="ml.bufferSetting('show_timestamps')"
                class="kiwi-messagelist-time"
            >
                {{ ml.formatTime(message.time) }}
            </span>
            <span
                :style="ml.nickStyle(message.nick)"
                :data-nick="message.nick"
                class="kiwi-messagelist-nick"
                @mouseover="ml.hover_nick=message.nick.toLowerCase();"
                @mouseout="ml.hover_nick='';"
            >
                {{ message.user ? userModePrefix(message.user) : '' }} {{ message.nick }}:
            </span>
            <span v-html="ml.formatMessage(message)" />
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
    props: ['ml', 'message', 'idx'],
    data: function data() {
        return {
        };
    },
    computed: {
    },
    methods: {
        isHoveringOverMessage: function isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
        userModePrefix: function userModePrefix(user) {
            return this.ml.buffer.userModePrefix(user);
        },
    },
};
</script>

<style lang="less">

.kiwi-messagelist-message--text {
    position: relative;
}

//Hide the timestamp unless the user hovers over the message in question
.kiwi-messagelist-message--text .kiwi-messagelist-time {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0 10px;
    display: none;
}

//display timestamp when hovering over the message
.kiwi-messagelist-message--text:hover .kiwi-messagelist-time {
    display: block;
}

.kiwi-messagelist-message--text .kiwi-messagelist-nick {
    display: inline-block;
    min-width: none;
    text-align: left;
    max-width: 110px;
    overflow: hidden;
    margin-right: 2px;
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
