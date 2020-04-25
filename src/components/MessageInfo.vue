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
        <div
            :class="{'kiwi-messageinfo-actions--open': requestingInput}"
            class="kiwi-messageinfo-actions"
        >
            <a v-if="!requestingInput" class="u-link kiwi-messageinfo-reply" @click="openQuery">
                Reply in private
            </a>

            <div v-if="areWeAnOp() && !isSelf()" class="kiwi-messageinfo-opbuttons">
                <input-prompt
                    label="Kick reason:" @submit="onKick"
                    @cancel="requestingInput = false"
                >
                    <a v-if="!requestingInput"
                       class="u-link kiwi-messageinfo-kick-user" @click="requestingInput = true"
                    >
                        Kick {{ message.nick }}
                    </a>
                </input-prompt>
                <input-prompt
                    label="Ban reason:" @submit="onBan"
                    @cancel="requestingInput = false"
                >
                    <a v-if="!requestingInput"
                       class="u-link kiwi-messageinfo-ban-user" @click="requestingInput = true"
                    >
                        Ban {{ message.nick }}
                    </a>
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
            requestingInput: false,
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
        isSelf: function isSelf() {
            let user = this.$state.getUser(this.buffer.getNetwork().id, this.message.nick);
            return this.buffer.getNetwork().ircClient.user.nick === user.nick;
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
    padding: 0;
}

.kiwi-messageinfo-urls {
    margin-top: 10px;
    padding-top: 10px;
    padding-bottom: 10px;
    border-top: 1px solid;
    border-bottom: 1px solid;
}

.kiwi-messageinfo-url {
    margin-bottom: 5px;
    display: flex;
}

.kiwi-messageinfo-urls .kiwi-messageinfo-url:last-of-type {
    margin-bottom: 0;
}

.kiwi-messageinfo-actions {
    margin-top: 10px;
    overflow: hidden;
    width: 100%;
    text-align: left;
}

.kiwi-messageinfo-url .u-link {
    white-space: nowrap;
    text-overflow: ellipsis;
    display: inline-block;
    overflow: hidden;
    flex: 1;
    line-height: 30px;
    margin-left: 10px;
    padding: 5px 10px;
    text-align: center;
    border: 1px solid;
    border-radius: 3px;
}

.kiwi-messageinfo-close {
    position: absolute;
    right: 20px;
    bottom: 5px;
    font-size: 1.3em;
    cursor: pointer;
}

.kiwi-messageinfo-opbuttons {
    margin-left: 2em;
    display: inline-block;
}

.kiwi-messageinfo-actions--open .kiwi-messageinfo-opbuttons {
    margin-left: 0;
}

.kiwi-messageinfo-opbuttons .u-input-prompt a,
.kiwi-messageinfo-reply {
    padding: 5px 10px;
    display: inline-block;
    border-radius: 4px;
}

.kiwi-messageinfo-opbuttons .u-input-prompt input {
    margin-bottom: 5px;
}

@media screen and (max-width: 490px) {
    .kiwi-messageinfo-actions {
        text-align: center;
    }

    .kiwi-messageinfo-opbuttons {
        margin: 0;
    }

    .kiwi-messageinfo-opbuttons .u-input-prompt a {
        margin-top: 10px;
    }
}
</style>
