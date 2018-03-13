<template>
    <div
        @click="ml.onMessageClick($event, message)"
        class="kiwi-messagelist-message kiwi-messagelist-message--modern"
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
        <div class="kiwi-messagelist-modern-left">
            <div
                v-if="isMessage(message)"
                class="kiwi-messagelist-modern-avatar"
                :style="{
                    'background-color': nickColour(message.nick)
                }"
                v-bind:data-nick="message.nick"
            >
                {{message.nick[0]}}
            </div>
        </div>
        <div class="kiwi-messagelist-modern-right">
            <div
                class="kiwi-messagelist-nick"
                v-bind:style="ml.nickStyle(message.nick)"
                v-bind:data-nick="message.nick"
                @mouseover="ml.hover_nick=message.nick.toLowerCase();"
                @mouseout="ml.hover_nick='';"
            >{{message.user ? userModePrefix(message.user) : ''}}{{message.nick}}</div>
            <div
                v-if="isMessage(message) && ml.bufferSetting('show_timestamps')"
                class="kiwi-messagelist-time"
            >
                {{ml.formatTime(message.time)}}
            </div>
            <div class="kiwi-messagelist-body" v-html="ml.formatMessage(message)"></div>

            <message-info
                v-if="ml.message_info_open===message"
                :message="message"
                :buffer="ml.buffer"
                @close="ml.toggleMessageInfo()"
            />
        </div>
    </div>
</template>

<script>

// import state from '@/libs/state';
import * as TextFormatting from '@/helpers/TextFormatting';
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
        nickColour: function nickColour(nick) {
            if (this.ml.bufferSetting('colour_nicknames_in_messages')) {
                return TextFormatting.createNickColour(nick);
            }
            return '';
        },
        isMessage: function isMessage(message) {
            let types = ['privmsg', 'action', 'notice'];
            return types.indexOf(message.type) > -1;
        },
        userModePrefix: function userModePrefix(user) {
            return Misc.userModePrefix(user, this.ml.buffer);
        },
    },
};
</script>

<style lang="less">

.kiwi-messagelist-message--modern {
    border-left: 7px solid transparent !important;
    display: flex;
    transition: none !important;

    .kiwi-messagelist-body {
        white-space: pre-wrap;
        word-wrap: break-word;
        display: block;
        margin-left: 0;
    }

    .kiwi-messagelist-body a {
        word-break: break-all;
    }

    .kiwi-messagelist-modern-left {
        display: flex;
        width: 50px;
    }

    .kiwi-messagelist-modern-right {
        margin-left: 5px;
        padding-top: 0;
        width: 100%;
    }

    .kiwi-messagelist-modern-avatar {
        text-transform: uppercase;
        cursor: pointer;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        text-align: center;
        line-height: 40px;
        font-size: 1em;
        font-weight: 600;
        color: #fff;
        margin-top: 3px;
    }

    .kiwi-messagelist-nick {
        float: left;
        width: auto;
        text-align: left;
        padding: 0;
        font-size: 1.1em;
        padding-right: 10px;
    }

    .kiwi-messagelist-time {
        margin: 0 10px 0 0;
        display: inline-block;
        font-size: 0.8em;
        font-weight: 400;
        padding: 0;
        opacity: 0.8;
        cursor: default;
    }

    &.kiwi-messagelist-message-repeat {
        margin-top: 0;
        margin-bottom: 0;
        padding-top: 0;

        .kiwi-messagelist-modern-right {
            padding-top: 0;
        }
    }

    &.kiwi-messagelist-message-repeat .kiwi-messagelist-modern-avatar {
        display: none;
    }

    &.kiwi-messagelist-message-repeat .kiwi-messagelist-nick,
    &.kiwi-messagelist-message-repeat .kiwi-messagelist-time {
        display: none;
    }

    &.kiwi-messagelist-message--highlight {
        background: none;
    }
}

@media screen and (max-width: 769px) {
    .kiwi-messagelist-message--modern .kiwi-messagelist-modern-left {
        width: 10px;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-privmsg .kiwi-messagelist-modern-left {
        display: none;
    }

    .kiwi-messagelist-message--modern .kiwi-messagelist-modern-right {
        margin-left: 0;
    }
}
</style>
