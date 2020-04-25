<template>
    <div
        :class="[
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
            (message.user && userMode(message.user)) ?
                'kiwi-messagelist-message--user-mode-'+userMode(message.user) :
                ''
        ]"
        :data-message-id="message.id"
        :data-nick="(message.nick||'').toLowerCase()"
        class="kiwi-messagelist-message kiwi-messagelist-message--compact"
        @click="ml.onMessageClick($event, message)"
    >
        <div
            v-if="ml.bufferSetting('show_timestamps')"
            :title="ml.formatTimeFull(message.time)"
            class="kiwi-messagelist-time"
        >
            {{ ml.formatTime(message.time) }}
        </div>
        <div
            :style="{ 'color': userColour }"
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
            <away-status-indicator
                v-if="message.user"
                :network="getNetwork()" :user="message.user"
                :toggle="false"
            />
            <span class="kiwi-messagelist-nick--prefix">
                {{ message.user ? userModePrefix(message.user) : '' }}
            </span>
            {{ message.nick }}
        </div>
        <div
            v-if="message.bodyTemplate && message.bodyTemplate.$el"
            v-rawElement="message.bodyTemplate.$el"
            class="kiwi-messagelist-body"
        />
        <div v-else class="kiwi-messagelist-body" v-html="ml.formatMessage(message)" />

        <message-info
            v-if="ml.message_info_open===message"
            :message="message"
            :buffer="ml.buffer"
            @close="ml.toggleMessageInfo()"
        />

        <div v-if="message.embed.payload">
            <media-viewer
                :url="message.embed.payload"
                :show-pin="true"
                @close="message.embed.payload = ''"
                @pin="ml.openEmbedInPreview(message)"
            />
        </div>
    </div>
</template>

<script>
'kiwi public';

// eslint-plugin-vue's max-len rule reads the entire file, including the CSS. so we can't use this
// here as some of the rules cannot be broken up any smaller
/* eslint-disable max-len */

import MediaViewer from './MediaViewer';
import AwayStatusIndicator from './AwayStatusIndicator';
import MessageInfo from './MessageInfo';

export default {
    components: {
        AwayStatusIndicator,
        MessageInfo,
        MediaViewer,
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
        getNetwork() {
            return this.ml.buffer.getNetwork();
        },
        isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
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
    left: 8px;
    top: -1px;
    position: absolute;
    white-space: nowrap;
}

.kiwi-messagelist-message--compact .kiwi-messagelist-nick:hover {
    width: auto;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-nick .kiwi-messagelist-time {
    margin-right: 10px;
    opacity: 0.8;
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

.kiwi-messagelist-message--compact.kiwi-messagelist-message-connection .kiwi-messagelist-time {
    display: none;
}

.kiwi-messagelist-message--compact.kiwi-messagelist-message-connection .kiwi-messagelist-body {
    display: inline-block;
    margin: 0;
    padding: 10px 0;
    margin-left: 131px;
    font-size: 0.8em;
    opacity: 0.8;
    font-weight: 600;
}

//Channel topic
.kiwi-messagelist-message--compact.kiwi-messagelist-message-topic {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    margin: 1em 0;
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

// Traffic messages have an opacity lower than 1, so we do a blanket statment to make sure all
// messages are opacity: 1, rather than just specifying one.
.kiwi-messagelist-message--compact.kiwi-messagelist-message--unread {
    opacity: 1;
}

// Mobile layout (matches this.$state.ui.is_narrow)
@media screen and (max-width: 769px) {
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
        box-sizing: border-box;
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

// Moderate screen size
// Give more space to the nickname column on larger screens
@media screen and (min-width: 1000px) {
    // Nicknames
    .kiwi-messagelist-message--compact .kiwi-messagelist-nick {
        width: 160px;
        min-width: 160px;
    }

    .kiwi-messagelist-message--compact .kiwi-messagelist-nick:hover {
        width: auto;
    }

    // Messages
    .kiwi-messagelist-message--compact .kiwi-messagelist-body {
        margin-left: 170px;
    }

    .kiwi-messagelist-message--compact .kiwi-messageinfo {
        padding-left: 180px;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
        margin-left: 181px;
    }

    .kiwi-messagelist-message--compact.kiwi-messagelist-message-connection .kiwi-messagelist-body {
        margin-left: 181px;
    }
}

</style>
