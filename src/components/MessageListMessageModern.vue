<template>
    <div
        :class="[
            isRepeat() ?
                'kiwi-messagelist-message--authorrepeat' :
                'kiwi-messagelist-message--authorfirst',
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
        class="kiwi-messagelist-message kiwi-messagelist-message--modern"
        @click="ml.onMessageClick($event, message, true)"
        @dblclick="ml.onMessageDblClick($event, message)"
    >
        <div class="kiwi-messagelist-modern-left">
            <message-avatar
                v-if="isMessage(message)"
                :message="message"
                :data-nick="message.nick"
            />
        </div>
        <div class="kiwi-messagelist-modern-right">
            <div
                :style="{ 'color': userColour }"
                class="kiwi-messagelist-nick"
                @click="ml.openUserBox(message.nick)"
                @mouseover="ml.hover_nick=message.nick.toLowerCase();"
                @mouseout="ml.hover_nick='';"
            >{{ message.user ? userModePrefix(message.user) : '' }}{{ message.nick }}</div>
            <div
                v-if="isMessage(message) && ml.bufferSetting('show_timestamps')"
                :title="ml.formatTimeFull(message.time)"
                class="kiwi-messagelist-time"
            >
                {{ ml.formatTime(message.time) }}
            </div>
            <div class="kiwi-messagelist-body" v-html="ml.formatMessage(message)"/>

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
'kiwi public';

// eslint-plugin-vue's max-len rule reads the entire file, including the CSS. so we can't use this
// here as some of the rules cannot be broken up any smaller
/* eslint-disable max-len */

import MessageInfo from './MessageInfo';
import MessageListAvatar from './MessageListAvatar';

export default {
    components: {
        MessageAvatar: MessageListAvatar,
        MessageInfo,
    },
    props: ['ml', 'message', 'idx'],
    data: function data() {
        return {
        };
    },
    computed: {
        userColour() {
            return this.ml.userColour(this.message.user);
        },
    },
    methods: {
        isRepeat() {
            let ml = this.ml;
            let idx = this.idx;
            let message = this.message;
            let prevMessage = ml.filteredMessages[idx - 1];

            return prevMessage &&
                prevMessage.nick === message.nick &&
                message.time - prevMessage.time < 60000 &&
                prevMessage.type !== 'traffic' &&
                message.type !== 'traffic';
        },
        isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
        isMessage(message) {
            let types = ['privmsg', 'action', 'notice', 'message'];
            return types.indexOf(message.type) > -1;
        },
        userModePrefix(user) {
            return this.ml.buffer.userModePrefix(user);
        },
    },
};
</script>

<style lang="less">

.kiwi-messagelist-message--modern {
    border-left: 7px solid transparent;
    display: flex;
    margin: 0 0 0 20px;
    margin-left: 0;
    padding: 15px 10px;
}

.kiwi-messagelist-modern-left {
    user-select: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-traffic .kiwi-messagelist-modern-left {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorfirst.kiwi-messagelist-message-topic {
    padding: 10px 20px;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat {
    margin-top: 0;
    padding-top: 0;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-modern-right {
    padding-top: 0;
}

.kiwi-messagelist-message-modern.kiwi-messagelist-message-topic,
.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat.kiwi-messagelist-message-topic {
    padding-top: 10px;
    padding-bottom: 10px;
    margin: 10px 2.5%;
    width: 95%;
    box-sizing: border-box;
    margin-bottom: 10px;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-topic {
    margin: 10px 20px 10px 20px;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-topic .kiwi-messagelist-modern-left {
    display: none;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-message-topic .kiwi-messagelist-modern-left,
.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat.kiwi-messagelist-message-topic .kiwi-messagelist-modern-left {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-avatar {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-nick,
.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-time {
    display: none;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-message-traffic .kiwi-messagelist-modern-right,
.kiwi-messagelist-message--modern .kiwi-messagelist-message-mode .kiwi-messagelist-modern-right {
    float: left;
    margin-left: 0;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-message-mode .kiwi-messagelist-nick {
    display: none;
}

/* Connection styling */
.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection {
    padding: 0;
    box-sizing: border-box;
    margin: 10px auto;
    width: 100%;
    border: none;
    opacity: 1;
    border-left: none;
    text-align: center;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-time,
.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-body {
    line-height: 30px;
    font-weight: 100;
    margin: 0 auto;
    border-radius: 4px;
    display: inline-block;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-message {
    margin-bottom: 0;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-modern-left {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-modern-right {
    margin-left: 0;
    padding: 0;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-body {
    white-space: pre-wrap;
    word-wrap: break-word;
    display: block;
    margin-left: 0;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-modern-left {
    display: flex;
    width: 50px;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-modern-right {
    margin-left: 5px;
    padding-top: 0;
    width: 100%;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-nick {
    float: left;
    width: auto;
    text-align: left;
    padding: 0;
    font-size: 1.1em;
    padding-right: 10px;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-time {
    margin: 0 10px 0 0;
    display: inline-block;
    font-size: 0.8em;
    font-weight: 400;
    padding: 0;
    opacity: 0.8;
    cursor: default;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-item .kiwi-messagelist-body {
    margin-bottom: 10px;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-traffic {
    margin-right: 0;
    padding-left: 60px;
}

@media screen and (max-width: 769px) {
    .kiwi-messagelist-message--modern .kiwi-messagelist-modern-left {
        width: 10px;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-privmsg .kiwi-messagelist-modern-left,
    .kiwi-messagelist-message-notice .kiwi-messagelist-modern-left {
        display: none;
    }

    .kiwi-messagelist-message--modern .kiwi-messagelist-modern-right {
        margin-left: 0;
    }

    .kiwi-messagelist-message--modern {
        margin: 0;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-connection {
        padding: 0;
        box-sizing: border-box;
        margin: 0;
        border: none;
        background: #42b992;
        width: 100%;
        border-radius: 0;
        opacity: 0.8;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-body {
        line-height: 50px;
        font-weight: 600;
        padding: 0;
    }

    .kiwi-messagelist-message-action .kiwi-messagelist-modern-left {
        display: none;
    }

    .kiwi-messagelist-message--modern .kiwi-messagelist-avatar {
        display: none;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-traffic {
        padding-left: 10px;
    }
}
</style>
