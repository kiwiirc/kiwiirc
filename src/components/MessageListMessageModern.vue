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
            (message.user && userMode(message.user)) ?
                'kiwi-messagelist-message--user-mode-'+userMode(message.user) :
                ''
        ]"
        :data-message-id="message.id"
        :data-nick="(message.nick||'').toLowerCase()"
        class="kiwi-messagelist-message kiwi-messagelist-message--modern"
        @click="ml.onMessageClick($event, message, true)"
        @dblclick="ml.onMessageDblClick($event, message)"
    >
        <div class="kiwi-messagelist-modern-left">
            <message-avatar
                v-if="isMessage(message) && displayAvatar(message)"
                :message="message"
                :data-nick="message.nick"
                :user="message.user"
            />
            <away-status-indicator
                v-if="message.user && !isRepeat()"
                :network="getNetwork()" :user="message.user"
                :toggle="false"
                class="kiwi-messagelist-awaystatus"
            />
            <typing-status-indicator
                v-if="message.user"
                :network="getNetwork()" :user="message.user"
                class="kiwi-messagelist-typingstatus"
            />

        </div>
        <div class="kiwi-messagelist-modern-right">
            <div class="kiwi-messagelist-top">
                <div
                    v-if="message.nick"
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
                    <span class="kiwi-messagelist-nick-prefix">{{
                        message.user ?
                            userModePrefix(message.user) :
                            ''
                    }}</span>{{ message.nick }}
                </div>
                <div
                    v-if="showRealName"
                    class="kiwi-messagelist-realname"
                    @click="ml.openUserBox(message.nick)"
                    @mouseover="ml.hover_nick=message.nick.toLowerCase();"
                    @mouseout="ml.hover_nick='';"
                >
                    {{ message.user.realname }}
                </div>
                <div
                    v-if="isMessage(message) && ml.bufferSetting('show_timestamps')"
                    :title="ml.formatTimeFull(message.time)"
                    class="kiwi-messagelist-time"
                >
                    {{ ml.formatTime(message.time) }}
                </div>
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
    </div>
</template>

<script>
'kiwi public';

// eslint-plugin-vue's max-len rule reads the entire file, including the CSS. so we can't use this
// here as some of the rules cannot be broken up any smaller
/* eslint-disable max-len */

import { urlRegex } from '@/helpers/TextFormatting';
import MessageInfo from './MessageInfo';
import MessageListAvatar from './MessageListAvatar';
import AwayStatusIndicator from './AwayStatusIndicator';
import TypingStatusIndicator from './TypingStatusIndicator';
import MediaViewer from './MediaViewer';

export default {
    components: {
        MessageAvatar: MessageListAvatar,
        MessageInfo,
        AwayStatusIndicator,
        TypingStatusIndicator,
        MediaViewer,
    },
    props: ['ml', 'message', 'idx'],
    data: function data() {
        return {
        };
    },
    computed: {
        showRealName() {
            // Showing realname is not enabled
            if (!this.ml.buffer.setting('show_realnames')) {
                return false;
            }

            // Server does not support extended-join so realname would be inconsistent
            let client = this.ml.buffer.getNetwork().ircClient;
            if (!client.network.cap.isEnabled('extended-join')) {
                return false;
            }

            // We dont have a user or users realname
            if (!this.message.user || !this.message.user.realname) {
                return false;
            }

            // No point showing the realname if it's the same as the nick
            if (this.message.user.nick.toLowerCase() === this.message.user.realname.toLowerCase()) {
                return false;
            }

            // If the realname contains a URL it's most likely a clients website
            if (urlRegex.test(this.message.user.realname)) {
                return false;
            }

            return true;
        },
        userColour() {
            return this.ml.userColour(this.message.user);
        },
    },
    methods: {
        getNetwork() {
            return this.ml.buffer.getNetwork();
        },
        isRepeat() {
            let ml = this.ml;
            let idx = this.idx;
            let message = this.message;
            let prevMessage = ml.filteredMessages[idx - 1];

            return !!prevMessage &&
                prevMessage.nick === message.nick &&
                message.time - prevMessage.time < 60000 &&
                prevMessage.type !== 'traffic' &&
                message.type !== 'traffic' &&
                message.type === prevMessage.type;
        },
        isHoveringOverMessage(message) {
            return message.nick && message.nick.toLowerCase() === this.hover_nick.toLowerCase();
        },
        isMessage(message) {
            let types = ['privmsg', 'action', 'notice', 'message'];
            return types.indexOf(message.type) > -1;
        },
        displayAvatar(message) {
            // if there is no user attached hide the avatar
            if (!message.user) {
                return false;
            }
            // dont show avatars in server or special buffers
            if (this.ml.buffer.isServer() || this.ml.buffer.isSpecial()) {
                return false;
            }
            return true;
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

.kiwi-messagelist-message--modern {
    border-left: 7px solid transparent;
    display: flex;
    margin: 0 0 0 20px;
    margin-left: 0;
    transition: border-colour 0.2s, background-color 0.2s;
}

.kiwi-messagelist-modern-left {
    user-select: none;
    position: relative;
    display: flex;
    width: 50px;
}

.kiwi-messagelist-awaystatus {
    width: 10px;
    top: 4px;
    right: 2px;
    height: 10px;
    position: absolute;
}

.kiwi-messagelist-message--modern .kiwi-avatar {
    height: 40px;
    width: 40px;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorfirst {
    padding-top: 10px;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat {
    border-top: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-modern-right {
    padding-top: 0;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-topic {
    margin: 20px 20px 20px 20px;
    padding: 10px 20px;
    width: auto;
    box-sizing: border-box;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-topic .kiwi-messagelist-modern-left {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-avatar {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message--authorrepeat .kiwi-messagelist-top {
    display: none;
}

/* Connection styling */
.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection {
    box-sizing: border-box;
    width: 100%;
    padding: 10px 0;
    opacity: 0.8;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-time,
.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-nick {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-body {
    padding: 0 20px;
    margin: 0 auto;
    display: inline-block;
    font-weight: 600;
    font-size: 0.8em;
    opacity: 0.8;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-body {
    white-space: pre-wrap;
    word-wrap: break-word;
    display: block;
    margin-left: 0;
    margin-bottom: 10px;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-body a {
    word-break: break-all;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-modern-right {
    margin-left: 5px;
    padding-top: 0;
    width: 100%;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-top > div {
    margin-right: 10px;
    padding: 0;
    display: inline-block;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-realname {
    cursor: pointer;
}

.kiwi-messagelist-message--modern .kiwi-messagelist-time {
    font-size: 0.8em;
    font-weight: 400;
    opacity: 0.6;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-body {
    margin-bottom: 0;
}

.kiwi-messagelist-message-traffic .kiwi-messagelist-modern-left,
.kiwi-messagelist-message-traffic .kiwi-messagelist-top {
    display: none;
}

.kiwi-messagelist-message--modern.kiwi-messagelist-message-traffic {
    margin-right: 0;
    padding-left: 60px;
}

.kiwi-messagelist-message-error {
    padding: 10px 0;
    font-weight: 600;
    line-height: normal;
}

.kiwi-messagelist-message-error .kiwi-messagelist-top {
    display: none;
}

.kiwi-messagelist-message-error .kiwi-messagelist-body {
    margin-bottom: 0;
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
        width: 100%;
        border-radius: 0;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-connection .kiwi-messagelist-body {
        line-height: 50px;
        font-weight: 600;
        padding: 0 10px;
    }

    .kiwi-messagelist-message-action .kiwi-messagelist-modern-left {
        display: none;
    }

    .kiwi-messagelist-message--modern .kiwi-avatar {
        display: none;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-traffic {
        padding-left: 10px;
    }

    .kiwi-messagelist-message--modern.kiwi-messagelist-message-topic {
        margin: 0 15px 20px 15px;
    }
}

</style>
