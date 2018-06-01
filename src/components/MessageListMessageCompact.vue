<template>
    <div
        @click="ml.onMessageClick($event, message)"
        class="kiwi-messagelist-message kiwi-messagelist-message--compact"
        v-bind:class="[
            ml.filteredMessages[idx-1] &&
            ml.filteredMessages[idx-1].nick === message.nick &&
            message.time - ml.filteredMessages[idx-1].time < 60000 &&
            ml.filteredMessages[idx-1].type !== 'traffic' &&
            message.type !== 'traffic' ?
                'kiwi-messagelist-message--authorrepeat' :
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
        <div
            v-if="ml.bufferSetting('show_timestamps')"
            class="kiwi-messagelist-time"
        >
            {{ml.formatTime(message.time)}}
        </div>
        <div
            class="kiwi-messagelist-nick"
            v-bind:style="ml.nickStyle(message.nick)"
            @click="ml.openUserBox(message.nick)"
            @mouseover="ml.hover_nick=message.nick.toLowerCase();"
            @mouseout="ml.hover_nick='';"
        >{{message.user ? userModePrefix(message.user) : ''}}{{message.nick}}</div>
        <div class="kiwi-messagelist-body" v-html="ml.formatMessage(message)"></div>

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

.kiwi-messagelist-message--compact {
    position: relative;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-message-privmsg:hover,
.kiwi-messagelist-message--compact .kiwi-messagelist-message-action:hover,
.kiwi-messagelist-message--compact .kiwi-messagelist-message-notice:hover, {
    cursor: pointer;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-message--blur {
    opacity: 0.5;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-nick {
    width: 110px;
    min-width: 110px;
    display: inline-block;
    left: 0;
    top: -1px;
    position: absolute;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-nick:hover {
    width: auto;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-nick .kiwi-messagelist-time {
    margin-right: 10px;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-time {
    display: inline-block;
    float: right;
    font-size: 12px;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-body {
    display: block;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin-left: 120px;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--compact .kiwi-messageinfo {
    padding-left: 130px;
}

//Channel traffic messages
.kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic {
    margin: 0;
    padding: 1px 0;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
    margin-left: 131px;
}

//Channel Connection's
.kiwi-messagelist-message--compact.kiwi-messagelist-message-connection {
    text-align: center;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-connection .kiwi-messagelist-nick,
.kiwi-messagelist-message--compact.kiwi-messagelist-message-connection .kiwi-messagelist-time {
    display: none;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-connection .kiwi-messagelist-body {
    display: inline-block;
    margin-left: auto;
}

//Channel topic
.kiwi-messagelist-message--compact.kiwi-messagelist-message-topic {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    margin: 5px 0;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-topic .kiwi-messagelist-body {
    padding-right: 0;
    max-width: 95%;
    margin-left: 20px;
}

//Repeat messages, remove the time and author name
.kiwi-messagelist-message--compact.kiwi-messagelist-message--authorrepeat {
    .kiwi-messagelist-time,
    .kiwi-messagelist-nick {
        display: none;
    }
}

// Traffic messages have an opacity lower than 1, so we do a blanket statment to make sure all messages are opacity: 1, rather than just specifying one.
.kiwi-messagelist-message--compact.kiwi-messagelist-message--unread {
    opacity: 1;
}

@media screen and (max-width: 700px) {
    .kiwi-messagelist-message--compact {
        padding: 5px;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-nick {
        display: inline;
        width: auto;
        min-width: auto;
        float: left;
        position: static;
        padding-left: 0;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-time {
        text-align: right;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-body {
        float: left;
        width: 100%;
        margin-left: 0;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message--unread .kiwi-messagelist-body {
        padding-left: 10px;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-message--authorrepeat .kiwi-messagelist-nick {
        display: none;
    }

    .kiwi-messagelist-message--compact .kiwi-messageinfo {
        padding-left: 2px;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
        margin-left: 0;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic {
        margin-left: 10px;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic.kiwi-messagelist-message--unread {
        margin-left: 0;
        padding-left: 10px;
    }
}

.kiwi-messagelist-message--compact .kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-item:last-of-type {
    margin-bottom: 5px;
}

</style>
