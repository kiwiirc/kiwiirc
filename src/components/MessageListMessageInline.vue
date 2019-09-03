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
        :data-message-id="message.id"
        :data-nick="(message.nick||'').toLowerCase()"
        class="kiwi-messagelist-message kiwi-messagelist-message--text"
        @click="ml.onMessageClick($event, message, true)"
        @dblclick="ml.onMessageDblClick($event, message)"
    >
        <div>
            <span
                v-if="ml.bufferSetting('show_timestamps')"
                class="kiwi-messagelist-time"
            >
                {{ ml.formatTime(message.time) }}
            </span>
            <span
                :style="{ 'color': userColour }"
                :data-nick="message.nick"
                :class="[
                    'kiwi-messagelist-nick',
                    (message.user && userMode(message.user)) ?
                        'kiwi-messagelist-nick--mode-'+userMode(message.user) :
                        ''
                ]"
                @click="ml.openUserBox(message.nick)"
                @mouseover="ml.hover_nick=message.nick.toLowerCase();"
                @mouseout="ml.hover_nick='';"
            >
                <span class="kiwi-messagelist-nick--prefix">
                    {{ message.user ? userModePrefix(message.user) : '' }}
                </span>
                <span>{{ displayNick }}</span>
            </span>
            <div
                v-rawElement="message.bodyTemplate.$el"
                v-if="message.bodyTemplate && message.bodyTemplate.$el"
                class="kiwi-messagelist-body"
            />
            <div v-else class="kiwi-messagelist-body" v-html="ml.formatMessage(message)"/>
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

import MessageInfo from './MessageInfo';

export default {
    components: {
        MessageInfo,
    },
    props: ['ml', 'message', 'idx'],
    data() {
        return { };
    },
    computed: {
        displayNick() {
            let suffix = this.message.nick ?
                ':' :
                '';

            return this.message.nick + suffix;
        },
        userColour() {
            return this.ml.userColour(this.message.user);
        },
    },
    methods: {
        userMode(user) {
            return this.ml.buffer.userMode(user);
        },
        userModePrefix(user) {
            return this.ml.buffer.userModePrefix(user);
        },
    },
};
</script>

<style lang="less">

.kiwi-messagelist-message--text {
    position: relative;
    padding: 4px 10px;
    margin: 0;
    text-align: left;
}

//Hide the timestamp unless the user hovers over the message in question
.kiwi-messagelist-message--text .kiwi-messagelist-time {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0 10px;
    display: none;
    opacity: 0.8;
}

//display timestamp when hovering over the message
.kiwi-messagelist-message--text:hover .kiwi-messagelist-time {
    display: block;
    border-radius: 5px 0 0 5px;
}

// Hide the unread message seperator
.kiwi-messagelist-message--text .kiwi-messagelist-seperator {
    display: none;
}

.kiwi-messagelist-message--text .kiwi-messagelist-nick {
    display: inline;
    text-align: left;
    margin-right: 2px;
    padding: 0;
}

.kiwi-messagelist-message--text .kiwi-messagelist-nick:hover {
    max-width: none;
    width: auto;
}

.kiwi-messagelist-message--text .kiwi-messagelist-body {
    display: inline;
    padding: 0;
    white-space: pre-wrap;
}

.kiwi-messagelist-message--text .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--text .kiwi-messagelist-message-privmsg:hover,
.kiwi-messagelist-message--text .kiwi-messagelist-message-action:hover,
.kiwi-messagelist-message--text .kiwi-messagelist-message-notice:hover, {
    cursor: pointer;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-connection .kiwi-messagelist-body {
    display: inline-block;
    margin: 0;
    font-size: 0.8em;
    opacity: 0.8;
    padding: 0;
}

.kiwi-messagelist-message--text.kiwi-messagelist-message-connection .kiwi-messagelist-time {
    display: none;
}

//Channel topic
.kiwi-messagelist-message--text.kiwi-messagelist-message-topic {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    margin: 10px 0;
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
