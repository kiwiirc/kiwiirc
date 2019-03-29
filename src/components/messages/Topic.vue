<template>
    <div class="kiwi-message-topic">
        <div class="kiwi-message-topic-content" v-html="formattedTopic" />
        <div class="kiwi-message-topic-more">
            <a class="fa fa-info-circle" @click="moreInfo()" />
        </div>
    </div>
</template>

<script>
'kiwi public';

import Vue from 'vue';
import toHtml from '@/libs/renderers/Html';
import formatIrcMessage from '@/libs/MessageFormatter';

const component = {
    props: ['buffer', 'message'],
    data() {
        return {
            topic: '',
        };
    },
    computed: {
        formattedTopic() {
            let blocks = formatIrcMessage(this.topic, { extras: false });
            return toHtml(blocks);
        },
    },
    methods: {
        moreInfo() {
            this.$state.$emit('sidebar.show', 'about');
        },
    },
};

export default component;

export function listenForMessages(state) {
    const Ctor = Vue.extend(component);

    state.$on('message.new', (event) => {
        if (event.message.type === 'topic') {
            event.message.template = new Ctor({
                propsData: {
                    buffer: event.buffer,
                    message: event.message,
                },
            });
            event.message.template.topic = event.message.message;
            event.message.template.$mount();
        }
    });
}
</script>

<style>

.kiwi-message-topic {
    border-radius: 5px;
    margin: 18px;
    text-align: center;
    position: relative;
    min-height: 0;
    display: block;
    padding: 4px 4px;
    overflow: hidden;
}

.kiwi-message-topic-content {
    margin: 0 20px;
}

.kiwi-message-topic-more {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 2px;
    margin-right: 4px;
    font-size: 120%;
    cursor: pointer;
}

</style>
