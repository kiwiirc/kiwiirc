<template>
    <div class="kiwi-message-topic">
        <div class="kiwi-message-topic-content" v-html="formattedTopic"/>
        <div v-if="topic_by" class="kiwi-message-topic-setby">{{ formattedSetBy }}</div>
    </div>
</template>

<script>
'kiwi public';

import Vue from 'vue';
import _ from 'lodash';
import * as TextFormatting from '@/helpers/TextFormatting';
import formatIrcMessage from '@/libs/MessageFormatter';

const component = {
    data() {
        return {
            topic: '',
            topic_by: '',
            topic_when: '',
        };
    },
    computed: {
        formattedTopic() {
            let showEmoticons = this.$state.setting('buffers.show_emoticons');
            let blocks = formatIrcMessage(this.topic, { extras: false });
            let content = TextFormatting.styleBlocksToHtml(blocks, showEmoticons, null);
            return content.html;
        },
        formattedSetBy() {
            return TextFormatting.t('topic_setby', {
                who: this.topic_by,
                when: new Date(this.topic_when).toLocaleString(),
            });
        },
    },
};

export default component;

export function listenForMessages(state) {
    const Ctor = Vue.extend(component);

    state.$on('message.new', (message, buffer) => {
        if (message.type === 'topic') {
            message.template = new Ctor();
            message.template.topic = message.message;
            message.template.$mount();
        }
    });

    state.$on('irc.topicsetby', (event, network) => {
        let buffer = network.bufferByName(event.channel);
        if (!buffer) {
            return;
        }

        // add setby to the most recent topic component if it exists
        let topicMessage = _.findLast(buffer.getMessages(), m => m.type === 'topic' && m.template);

        if (topicMessage) {
            topicMessage.template.topic_by = event.nick;
            topicMessage.template.topic_when = event.when * 1000;
        }
    });
}
</script>

<style>

.kiwi-message-topic {
    border-top: 1px solid #42b992;
    border-bottom: 1px solid #42b992;
    background: #f5f5f5;
    padding: 4px 60px;
    overflow: hidden;
}

.kiwi-message-topic-setby {
    display: inline-block;
    font-size: 80%;
    float: right;
}

</style>
