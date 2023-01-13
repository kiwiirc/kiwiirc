<template>
    <div class="kiwi-messageinfo" @click.stop>
        <div v-if="message.mentioned_urls.length > 0" class="kiwi-messageinfo-urls">
            <div v-for="url in message.mentioned_urls" :key="url" class="kiwi-messageinfo-url">
                <a
                    v-if="showLinkPreviews"
                    class="u-button u-button-secondary"
                    @click="urlPreview(url)"
                >Preview</a>
                <a :href="url" target="_blank" rel="noopener noreferrer" class="u-link">
                    {{ url }}
                </a>
            </div>
        </div>
        <div
            :class="{'kiwi-messageinfo-actions--open': requestingInput}"
            class="kiwi-messageinfo-actions"
        >
            <template v-if="!requestingInput">
                <component
                    :is="plugin.component"
                    v-for="plugin in pluginUiSections"
                    :key="plugin.id"
                    :plugin-props="{
                        buffer: buffer,
                        message: message,
                    }"
                    v-bind="plugin.props"
                    :buffer="buffer"
                    :message="message"
                    class="u-link kiwi-messageinfo-reply kiwi-messageinfo-plugin"
                />
            </template>
            <a
                v-if="!requestingInput && message.nick && buffer.name !== message.nick && !isSelf()"
                class="u-link kiwi-messageinfo-reply"
                @click="openQuery"
            >
                Reply in private
            </a>

            <div v-if="message.user && areWeAnOp() && !isSelf()" class="kiwi-messageinfo-opbuttons">
                <input-prompt
                    label="Kick reason:" @submit="onKick"
                    @cancel="requestingInput = false"
                >
                    <a
                        v-if="!requestingInput"
                        class="u-link kiwi-messageinfo-kick-user" @click="requestingInput = true"
                    >
                        Kick {{ message.nick }}
                    </a>
                </input-prompt>
                <input-prompt
                    label="Ban reason:" @submit="onBan"
                    @cancel="requestingInput = false"
                >
                    <a
                        v-if="!requestingInput"
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

import GlobalApi from '@/libs/GlobalApi';

export default {
    props: ['buffer', 'message'],
    data() {
        return {
            requestingInput: false,
            pluginUiSections: GlobalApi.singleton().messageInfoPlugins,
        };
    },
    computed: {
        showLinkPreviews() {
            return this.$state.setting('buffers.show_link_previews');
        },
    },
    methods: {
        urlPreview(url) {
            this.$state.$emit('mediaviewer.show', url);
        },
        areWeAnOp() {
            let ourNick = this.buffer.getNetwork().nick;
            return this.buffer.isUserAnOp(ourNick);
        },
        isSelf() {
            let user = this.$state.getUser(this.buffer.getNetwork().id, this.message.nick);
            return user && this.buffer.getNetwork().ircClient.user.nick === user.nick;
        },
        onBan(reason) {
            this.buffer.banKickUser(this.message.user, reason);
        },
        onKick(reason) {
            this.buffer.kickUser(this.message.user, reason);
        },
        openQuery() {
            let network = this.buffer.getNetwork();
            let buffer = this.$state.addBuffer(network.id, this.message.nick);
            this.$state.setActiveBuffer(network.id, buffer.name);
        },
    },
};
</script>

<style>
.kiwi-messageinfo {
    display: block;
    position: relative;
    padding: 0;
    margin-bottom: 10px;
}

.kiwi-messageinfo-urls {
    margin-top: 10px;
    padding-top: 10px;
    padding-bottom: 10px;
    border-top: 1px solid;
    border-bottom: 1px solid;
    overflow: hidden;
    width: 100%;
}

.kiwi-messageinfo-url {
    margin-bottom: 5px;
    display: flex;
}

.kiwi-messageinfo-url .u-button {
    line-height: 30px;
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
    margin-right: 4px;
}

@media screen and (max-width: 490px) {
    .kiwi-messageinfo-actions {
        text-align: center;
    }

    .kiwi-messageinfo-opbuttons {
        margin: 0;
    }
}
</style>
