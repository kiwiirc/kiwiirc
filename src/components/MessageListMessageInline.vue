<template functional>
    <div
        :class="[
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
                'kiwi-messagelist-message--user-mode-'+props.m().userMode(props.message.user) :
                '',
            data.staticClass,
        ]"
        :data-message-id="props.message.id"
        :data-nick="(props.message.nick||'').toLowerCase()"
        class="kiwi-messagelist-message kiwi-messagelist-message--text"
        @click="props.ml.onMessageClick($event, props.message, true)"
        @dblclick="props.ml.onMessageDblClick($event, props.message)"
    >
        <div>
            <span
                v-if="props.ml.bufferSetting('show_timestamps')"
                class="kiwi-messagelist-time"
            >
                {{ props.ml.formatTime(props.message.time) }}
            </span>
            <span
                :style="{ 'color': props.ml.userColour(props.message.user) }"
                :data-nick="props.message.nick"
                :class="[
                    'kiwi-messagelist-nick',
                    (props.message.user && props.m().userMode(props.message.user)) ?
                        'kiwi-messagelist-nick--mode-'+props.m().userMode(props.message.user) :
                        ''
                ]"
                @click="props.ml.openUserBox(props.message.nick)"
                @mouseover="props.ml.hover_nick=props.message.nick.toLowerCase();"
                @mouseout="props.ml.hover_nick='';"
            >
                <span class="kiwi-messagelist-nick--prefix">
                    {{ props.message.user ? props.m().userModePrefix(props.message.user) : '' }}
                </span>
                <span>{{ props.m().displayNick() }}</span>
            </span>
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
        </div>

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
</template>

<script>

import MediaViewer from './MediaViewer';
import MessageInfo from './MessageInfo';

const methods = {
    props: {},
    displayNick() {
        let props = this.props;
        let suffix = props.message.nick ?
            ':' :
            '';

        return props.message.nick + suffix;
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
                MessageInfo,
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
