<template functional>
    <div
        :class="[
            props.m().isRepeat() ?
                'kiwi-messagelist-message--authorrepeat' :
                'kiwi-messagelist-message--authorfirst',
            'kiwi-messagelist-message-' + props.message.type,
            props.message.type_extra ?
                'kiwi-messagelist-message-' + props.message.type + '-' + props.message.type_extra :
                '',
            props.ml.isMessageHighlight(props.message) ?
                'kiwi-messagelist-message--highlight' :
                '',
            props.ml.isHoveringOverMessage(props.message) ?
                'kiwi-messagelist-message--hover' :
                '',
            props.ml.buffer.last_read && props.message.time > props.ml.buffer.last_read ?
                'kiwi-messagelist-message--unread' :
                '',
            props.message.nick.toLowerCase() === props.ml.ourNick.toLowerCase() ?
                'kiwi-messagelist-message--own' :
                '',
            props.ml.message_info_open === props.message ?
                'kiwi-messagelist-message--info-open' :
                '',
            props.ml.message_info_open && props.ml.message_info_open !== props.message ?
                'kiwi-messagelist-message--blur' :
                '',
            (props.message.user && props.m().userMode(props.message.user)) ?
                'kiwi-messagelist-message--user-mode-' + props.m().userMode(props.message.user) :
                '',
            data.staticClass,
        ]"
        :data-message-id="props.message.id"
        :data-nick="(props.message.nick||'').toLowerCase()"
        class="kiwi-messagelist-message kiwi-messagelist-message--modern"
        @click="props.ml.onMessageClick($event, props.message, true)"
        @dblclick="props.ml.onMessageDblClick($event, props.message)"
    >
        <div class="kiwi-messagelist-modern-left">
            <component
                :is="injections.components.MessageAvatar"
                v-if="props.m().isMessage(props.message) && props.m().displayAvatar(props.message)"
                :message="props.message"
                :data-nick="props.message.nick"
                :user="props.message.user"
            />
            <component
                :is="injections.components.AwayStatusIndicator"
                v-if="props.message.user && !props.m().isRepeat()"
                :network="props.m().getNetwork()" :user="props.message.user"
                :toggle="false"
                class="kiwi-messagelist-awaystatus"
            />
            <component
                :is="injections.components.TypingStatusIndicator"
                v-if="props.message.user"
                :network="props.m().getNetwork()"
                :user="props.message.user"
                class="kiwi-messagelist-typingstatus"
            />

        </div>
        <div class="kiwi-messagelist-modern-right">
            <div class="kiwi-messagelist-top">
                <div
                    v-if="props.message.nick"
                    :style="{ 'color': props.ml.userColour(props.message.user) }"
                    :class="[
                        'kiwi-messagelist-nick',
                        props.message.user && props.m().userMode(props.message.user) ?
                            'kiwi-messagelist-nick--mode-'+props.m().userMode(props.message.user) :
                            ''
                    ]"
                    @click="props.ml.openUserBox(props.message.nick)"
                    @mouseover="props.ml.hover_nick=props.message.nick.toLowerCase();"
                    @mouseout="props.ml.hover_nick='';"
                >
                    <span class="kiwi-messagelist-nick-prefix">{{
                        props.message.user ?
                            props.m().userModePrefix(props.message.user) :
                            ''
                    }}</span>{{ props.message.nick }}
                </div>
                <div
                    v-if="props.m().showRealName()"
                    class="kiwi-messagelist-realname"
                    @click="props.ml.openUserBox(message.nick)"
                    @mouseover="props.ml.hover_nick=props.message.nick.toLowerCase();"
                    @mouseout="props.ml.hover_nick='';"
                >
                    {{ props.message.user.realname }}
                </div>
                <div
                    v-if="props.m().isMessage(props.message) &&
                        props.ml.bufferSetting('show_timestamps')"
                    :title="props.ml.formatTimeFull(props.message.time)"
                    class="kiwi-messagelist-time"
                >
                    {{ props.ml.formatTime(props.message.time) }}
                </div>
            </div>
            <div
                v-if="props.message.bodyTemplate && props.message.bodyTemplate.$el"
                v-rawElement="props.message.bodyTemplate.$el"
                class="kiwi-messagelist-body"
            />
            <div
                v-else
                class="kiwi-messagelist-body"
                v-html="props.ml.formatMessage(props.message)"
            />

            <component
                :is="injections.components.MessageInfo"
                v-if="props.ml.message_info_open===props.message"
                :message="props.message"
                :buffer="props.ml.buffer"
                @close="props.ml.toggleMessageInfo()"
            />

            <div v-if="props.message.embed.payload">
                <component
                    :is="injections.components.MediaViewer"
                    :url="props.message.embed.payload"
                    :show-pin="true"
                    @close="props.message.embed.payload = ''"
                    @pin="props.ml.openEmbedInPreview(props.message)"
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

const methods = {
    props: {},
    showRealName() {
        let props = this.props;

        // Showing realname is not enabled
        if (!props.ml.buffer.setting('show_realnames')) {
            return false;
        }

        // Server does not support extended-join so realname would be inconsistent
        let client = props.ml.buffer.getNetwork().ircClient;
        if (!client.network.cap.isEnabled('extended-join')) {
            return false;
        }

        // We dont have a user or users realname
        if (!props.message.user || !props.message.user.realname) {
            return false;
        }

        // No point showing the realname if it's the same as the nick
        if (props.message.user.nick.toLowerCase() === props.message.user.realname.toLowerCase()) {
            return false;
        }

        // If the realname contains a URL it's most likely a clients website
        if (urlRegex.test(props.message.user.realname)) {
            return false;
        }

        return true;
    },
    getNetwork() {
        let props = this.props;
        return props.ml.buffer.getNetwork();
    },
    isRepeat() {
        let props = this.props;
        let ml = props.ml;
        let idx = props.idx;
        let message = props.message;
        let prevMessage = ml.filteredMessages[idx - 1];

        return !!prevMessage &&
            prevMessage.nick === message.nick &&
            message.time - prevMessage.time < 60000 &&
            prevMessage.type !== 'traffic' &&
            message.type !== 'traffic' &&
            message.type === prevMessage.type;
    },
    isHoveringOverMessage(message) {
        let props = this.props;
        return message.nick && message.nick.toLowerCase() === props.ml.hover_nick.toLowerCase();
    },
    isMessage(message) {
        let types = ['privmsg', 'action', 'notice', 'message'];
        return types.indexOf(message.type) > -1;
    },
    displayAvatar(message) {
        let props = this.props;
        // if there is no user attached hide the avatar
        if (!message.user) {
            return false;
        }
        // dont show avatars in server or special buffers
        if (props.ml.buffer.isServer() || props.ml.buffer.isSpecial()) {
            return false;
        }
        return true;
    },
    userMode(user) {
        let props = this.props;
        return props.ml.buffer.userMode(user);
    },
    userModePrefix(user) {
        let props = this.props;
        return props.ml.buffer.userModePrefix(user);
    },
};

export default {
    inject: {
        components: {
            default: {
                MessageAvatar: MessageListAvatar,
                MessageInfo,
                AwayStatusIndicator,
                TypingStatusIndicator,
                MediaViewer,
            },
        },
    },
    props: {
        ml: Object,
        message: Object,
        idx: Number,
        m: {
            default: function m() {
                // vue uses this function to generate the prop. `this`==null Return our own function
                return function n() {
                    // Give our methods some props context before its function is called.
                    // This is only safe because the function on the methods object is called on
                    // the same js tick
                    methods.props = this;
                    return methods;
                };
            },
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
