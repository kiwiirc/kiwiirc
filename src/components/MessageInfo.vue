<template>
    <div class="kiwi-messageinfo" @click.stop>
        <div v-if="message.mentioned_urls.length > 0" class="kiwi-messageinfo-urls">
            <div v-for="url in message.mentioned_urls" :key="url" class="kiwi-messageinfo-url">
                <a
                    v-if="showLinkPreviews"
                    class="u-button u-button-secondary"
                    @click="urlPreview(url)"
                >{{ $t('preview') }}</a>
                <a
                    :href="url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="u-link"
                >{{ url }}</a>
            </div>
        </div>
        <div
            :class="{ 'kiwi-messageinfo-actions--open': requestingInput }"
            class="kiwi-messageinfo-actions"
        >
            <a
                v-if="!requestingInput && message.nick && buffer.name !== message.nick && !isSelf()"
                class="u-link kiwi-messageinfo-button kiwi-messageinfo-reply"
                @click="openQuery"
            >{{ $t('reply_in_private') }}</a>

            <template v-if="!requestingInput">
                <component
                    :is="plugin.component"
                    v-for="plugin in pluginUiSections"
                    :key="plugin.id"
                    :plugin-props="{
                        buffer,
                        message,
                    }"
                    v-bind="plugin.props"
                    :buffer="buffer"
                    :message="message"
                    class="u-link kiwi-messageinfo-button kiwi-messageinfo-plugin"
                />
            </template>

            <template v-if="message.user && areWeAnOp() && !isSelf()">
                <a
                    v-if="!requestingInput"
                    class="u-link kiwi-messageinfo-button kiwi-messageinfo-ban-user" @click="onBan"
                >{{ $t('ban') }}</a>
                <input-prompt
                    :label="`${$t('kick_reason')}:`" @submit="onKick"
                    @cancel="requestingInput = false"
                >
                    <a
                        v-if="!requestingInput"
                        class="u-link kiwi-messageinfo-kick-user" @click="requestingInput = true"
                    >{{ $t('kick') }}</a>
                </input-prompt>
            </template>
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
        onBan() {
            this.buffer.banUser(this.message.user);
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

.kiwi-messageinfo-urls .kiwi-messageinfo-url:last-of-type {
    margin-bottom: 0;
}

.kiwi-messageinfo-url .u-link {
    white-space: nowrap;
    text-overflow: ellipsis;
    display: inline-block;
    overflow: hidden;
    flex: 1;
    margin-left: 10px;
    padding: 5px 10px;
    text-align: center;
    border: 1px solid;
    border-radius: 3px;
}

.kiwi-messageinfo-actions {
    margin-top: 10px;
    overflow: hidden;
    width: 100%;
    text-align: center;
}

.kiwi-messageinfo-actions .u-link {
    display: inline-block;
    border-radius: 4px;
    margin: 0 4px 4px 0;
    padding: 5px 10px;
}
</style>
