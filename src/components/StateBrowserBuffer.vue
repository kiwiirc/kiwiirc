<template>
    <div class="kiwi-statebrowser-channel-wrapper">
        <div
            :data-name="buffer.name.toLowerCase()"
            :class="{
                'kiwi-statebrowser-channel-active': isActiveBuffer(),
                'kiwi-statebrowser-channel-notjoined': buffer.isChannel() &&
                    !buffer.joined
            }"
            class="kiwi-statebrowser-channel"
        >
            <div
                class="kiwi-statebrowser-channel-name"
                @click="$emit('selected')"
            >
                <away-status-indicator
                    v-if="buffer.isQuery() && awayNotifySupported()"
                    :network="network" :user="network.userByName(buffer.name)"
                />{{ buffer.name }}
            </div>
            <div class="kiwi-statebrowser-buffer-actions">
                <div class="kiwi-statebrowser-channel-labels">
                    <div
                        v-if="buffer.flags.unread && showMessageCounts(buffer)"
                        :class="[
                            buffer.flags.highlight ?
                                'kiwi-statebrowser-channel-label--highlight' :
                                ''
                        ]"
                        class="kiwi-statebrowser-channel-label"
                    >
                        {{ buffer.flags.unread > 999 ?
                            "999+": buffer.flags.unread }}
                    </div>
                </div>

                <div
                    class="kiwi-statebrowser-channel-leave"
                    @click="maybePromptClose()"
                >
                    <i class="fa fa-times" aria-hidden="true" />
                </div>
            </div>
        </div>
        <transition-expand>
            <div v-if="showPromptClose" class="kiwi-statebrowser-prompt-close">
                <span>{{
                    buffer.isChannel() ?
                        $t('prompt_leave_channel') :
                        $t('prompt_close_query')
                }}</span>
                <input-confirm
                    :flip-connotation="true"
                    @ok="closeBuffer()"
                    @submit="maybePromptClose()"
                />
            </div>
        </transition-expand>
    </div>
</template>

<script>

import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        AwayStatusIndicator,
    },
    props: ['buffer', 'activePrompt'],
    computed: {
        network() {
            return this.buffer.getNetwork();
        },
        showPromptClose() {
            return (this.activePrompt &&
                this.activePrompt.type === 'buffer' &&
                this.activePrompt.value === this.buffer);
        },
    },
    methods: {
        isActiveBuffer() {
            let buffer = this.buffer;
            return (
                buffer.networkid === this.$state.ui.active_network &&
                buffer.name === this.$state.ui.active_buffer
            );
        },
        awayNotifySupported() {
            return this.network.ircClient.network.cap.isEnabled('away-notify');
        },
        showMessageCounts() {
            return !this.buffer.setting('hide_message_counts');
        },
        maybePromptClose() {
            const setting = this.buffer.setting('prompt_leave');
            if (setting === 'none' || (
                setting !== 'all' && (
                    (this.buffer.isChannel() && setting !== 'channels') ||
                    (this.buffer.isQuery() && setting !== 'queries') ||
                    (this.buffer.isSpecial() && setting !== 'queries')
                )
            )) {
                // Prompt feature is disabled, just close the buffer
                this.closeBuffer();
                return;
            }

            const prompt = this.activePrompt;
            if (this.showPromptClose) {
                // Prompt is currently visible so close it
                prompt.type = undefined;
                prompt.value = undefined;
            } else {
                prompt.type = 'buffer';
                prompt.value = this.buffer;
            }
        },
        closeBuffer() {
            this.$state.removeBuffer(this.buffer);
        },
    },
};
</script>
