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
                'kiwi-messagelist-message-repeat' :
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
            v-bind:data-nick="message.nick"
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
    .kiwi-messagelist-message-privmsg:hover,
    .kiwi-messagelist-message-action:hover,
    .kiwi-messagelist-message-notice:hover, {
        cursor: pointer;
        border-left-color: #80ab52;
    }
    .kiwi-messagelist-message--blur {
        opacity: 0.5;
    }
    .kiwi-messagelist-nick {
        width: 120px;
        display: inline-block;
        float: left;
    }
    .kiwi-messagelist-time {
        display: inline-block;
        float: right;
    }
    .kiwi-messagelist-body {
        display: block;
        white-space: pre-wrap;
        word-wrap: break-word;
        margin-left: 130px;
    }
    .kiwi-messagelist-body a {
        word-break: break-all;
    }
    .kiwi-messageinfo {
        padding-left: 130px;
    }
    @media screen and (max-width: 700px) {
        .kiwi-messagelist-nick {
            display: inline;
            width: auto;
            float: none;
        }
        .kiwi-messagelist-body {
            margin-left: 2px;
        }
        .kiwi-messagelist-time {
        }
        .kiwi-messagelist-message-repeat .kiwi-messagelist-nick {
            display: none;
        }
        .kiwi-messageinfo {
            padding-left: 2px;
        }
    }
    .kiwi-messagelist-message-traffic .kiwi-messagelist-nick {
        display: none;
    }
}

</style>
