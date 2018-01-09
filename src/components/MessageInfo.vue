<template>
    <div class="kiwi-messageinfo" @click.stop>
        <div class="kiwi-messageinfo-author"><a @click="openQuery" class="u-link">Reply in private</a></div>

        <div v-if="areWeAnOp()" class="kiwi-messageinfo-opactions">
            <input-prompt @submit="onKick" label="Kick reason:"><a class="u-link">Kick {{message.nick}}</a></input-prompt> <br />
            <input-prompt @submit="onBan" label="Ban reason:"><a class="u-link">Ban {{message.nick}}</a></input-prompt>
        </div>

        <div v-if="message.mentioned_urls.length > 0" class="kiwi-messageinfo-urls">
            <div v-for="url in message.mentioned_urls" class="kiwi-messageinfo-url">
                <a class="u-button u-button-secondary" @click="urlPreview(url)">Preview</a> <a
                    :href="url"
                    target="_blank"
                    class="u-link"
                >{{url}}</a>
            </div>
        </div>

        <i class="fa fa-caret-up kiwi-messageinfo-close" @click="$emit('close')"></i>
    </div>
</template>

<script>

import state from '@/libs/state';

export default {
    components: {
    },
    data: function data() {
        return {
        };
    },
    props: ['buffer', 'message'],
    computed: {
    },
    methods: {
        urlPreview: function urlPreview(url) {
            state.$emit('mediaviewer.show', url);
        },
        areWeAnOp: function areWeAnOp() {
            let ourNick = this.buffer.getNetwork().nick;
            return this.buffer.isUserAnOp(ourNick);
        },
        onBan: function onBan(reason) {
            let network = this.buffer.getNetwork();
            network.ircClient.mode(this.buffer.name, '+b', this.message.nick);
        },
        onKick: function onKick(promptedReason) {
            let network = this.buffer.getNetwork();
            let defaultReason = state.setting('buffers.default_kick_reason');
            let reason = promptedReason || defaultReason;
            network.ircClient.raw('KICK', this.buffer.name, this.message.nick, reason);
        },
        openQuery: function openQuery() {
            let network = this.buffer.getNetwork();
            let buffer = state.addBuffer(network.id, this.message.nick);
            state.setActiveBuffer(network.id, buffer.name);
        },
    },
};
</script>

<style>
.kiwi-messageinfo {
    display: block;
    padding-top: 1em;
    padding-bottom: 1em;
    position: relative;
}
.kiwi-messageinfo-opactions a {
}
.kiwi-messageinfo-urls {
    margin-top: 5px;
    padding-top: 5px;
}
.kiwi-messageinfo-url {
    margin-bottom: 10px;
    display: flex;
}
.kiwi-messageinfo-url .u-link {
    white-space: nowrap;
    text-overflow: ellipsis;
    display: inline-block;
    overflow: hidden;
    flex: 1;
    margin: 0.4em 1em 0 1em;
}
.kiwi-messageinfo-close {
    position: absolute;
    right: 20px;
    bottom: 5px;
    font-size: 1.3em;
    cursor: pointer;
}
</style>
