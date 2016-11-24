<template>
    <div class="kiwi-header">
        <div class="kiwi-header-name">{{buffer.name}}</div>
        <div v-if="isChannel()" class="kiwi-header-topic" v-html="formatMessage(buffer.topic)"></div>
        <!-- <div v-if="!isChannel()" class="kiwi-header-topic">Private conversation with {{buffer.name}}</div> -->
    </div>
</template>

<script>

import * as TextFormatting from 'src/helpers/TextFormatting';

export default {
    data: function data() {
        return {
        };
    },
    props: ['buffer'],
    methods: {
        formatMessage: function formatMessage(messageBody) {
            let formatted = TextFormatting.ircCodesToHtml(messageBody);
            formatted = TextFormatting.linkifyUrls(formatted);
            return formatted;
        },
        isChannel: function isChannel() {
            return this.buffer.isChannel();
        },
    },
};

</script>

<style>
.kiwi-header {
    box-sizing: border-box;
}
</style>
