<template>
    <div class="kiwi-messageinfo" @click.stop>
        <div v-if="message.mentioned_urls.length > 0" class="kiwi-messageinfo-urls">
            <div v-for="url in message.mentioned_urls" :key="url" class="kiwi-messageinfo-url">
                <a class="u-button u-button-secondary" @click="urlPreview(url)">Preview</a>
                <a
                    :href="url"
                    target="_blank"
                    class="u-link"
                >
                    {{ url }}
                </a>
            </div>
        </div>

        <div class="kiwi-messageinfo-actions">
            <a class="u-link" @click="openQuery">Reply in private</a>

            <div class="kiwi-messageinfo-opbuttons">
                <input-prompt label="Kick reason:" @submit="onKick">
                    <a class="u-link kiwi-messageinfo-kick-user">Kick {{ message.nick }}</a>
                </input-prompt>
                <input-prompt label="Ban reason:" @submit="onBan">
                    <a class="u-link kiwi-messageinfo-ban-user">Ban {{ message.nick }}</a>
                </input-prompt>
            </div>
        </div>
    </div>
</template>

<script>
'kiwi public';

import state from '@/libs/state';

export default {
    components: {
    },
    props: ['buffer', 'message'],
    data: function data() {
        return {
        };
    },
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
    position: relative;
}

.kiwi-messageinfo-urls {
    margin-top: 10px;
    padding-top: 10px;
    padding-bottom: 10px;
}

.kiwi-messageinfo-url {
    margin-bottom: 5px;
    display: flex;
}

.kiwi-messageinfo-actions {
    margin-top: 10px;
    overflow: hidden;
    width: 100%;
    text-align: left;
}

.kiwi-messageinfo-opbuttons {
    float: right;
    width: auto;
}

.kiwi-messageinfo-url .u-link {
    white-space: nowrap;
    text-overflow: ellipsis;
    display: inline-block;
    overflow: hidden;
    flex: 1;
    line-height: 30px;
    margin-left: 10px;
}

.kiwi-messageinfo-close {
    position: absolute;
    right: 20px;
    bottom: 5px;
    font-size: 1.3em;
    cursor: pointer;
}

@media screen and (max-width: 410px) {
    .kiwi-messageinfo-actions {
        text-align: center;
    }

    .kiwi-messageinfo-opbuttons {
        width: 100%;
        margin-top: 10px;
        margin-bottom: 10px;
    }
}
</style>
