<template>
    <div class="kiwi-aboutbuffer">
        <h3>{{ b.name }}</h3>

        <div
            :class="{'kiwi-aboutbuffer-section--closed': closedSections.about}"
            class="kiwi-aboutbuffer-section"
        >
            <h4 @click="toggleSection('about')">
                <i class="fa fa-angle-right" /> {{ $t('about') }}
            </h4>
            <div>
                <p v-if="b.created_at">
                    {{ $t('created_on', { when: new Intl.DateTimeFormat().format(b.created_at) }) }}
                </p>

                <template v-if="b.topic">
                    <p v-html="formattedTopic" />
                    <p v-if="b.topic_by && b.topic_when">
                        {{
                            $t('topic_setby', {
                                who: b.topic_by,
                                when: new Intl.DateTimeFormat().format(b.topic_when)
                            })
                        }}
                    </p>
                </template>
                <p v-else>{{ $t('no_topic_set') }}</p>

                <p class="kiwi-aboutbuffer-usercount">
                    <a class="u-link " @click="sidebarState.showNicklist()">
                        {{ $t('person', {count: Object.keys(b.users || {}).length}) }}
                    </a>
                </p>
            </div>
        </div>

        <div
            :class="{'kiwi-aboutbuffer-section--closed': closedSections.highlights}"
            class="kiwi-aboutbuffer-section"
        >
            <h4 @click="toggleSection('highlights')">
                <i class="fa fa-angle-right" /> {{ $t('highlights') }}
            </h4>
            <div>
                <ul v-if="highlights.length > 0">
                    <li
                        v-for="msg in highlights"
                        :key="msg.id"
                        class="kiwi-aboutbuffer-highlight"
                        @click="buffer.scrollToMessage(msg.id)"
                    >
                        {{ msg.nick ? msg.nick + ': ' : '' }}<span v-html="msg.html" />
                    </li>
                </ul>
                <p v-else>{{ $t('nobody_mentioned_you') }}</p>
            </div>
        </div>

        <div
            v-if="areWeAnOp"
            :class="{'kiwi-aboutbuffer-section--closed': closedSections.invite}"
            class="kiwi-aboutbuffer-section"
        >
            <h4 @click="toggleSection('invite')">
                <i class="fa fa-angle-right" /> {{ $t('invite_user') }}
            </h4>
            <div>
                <div class="kiwi-aboutbuffer-invite u-form">
                    <input
                        v-model="inviteNick"
                        type="text"
                        class="u-input"
                        @keydown="inviteKeyDown"
                    >
                    <a class="u-button u-button-secondary" @click="inviteUser">
                        {{ $t('invite_user') }}
                    </a>
                </div>
                <auto-complete
                    v-if="invitableUsers.length > 0"
                    ref="autocomplete"
                    class="kiwi-aboutbuffer-invite-auto-complete"
                    items-per-page="5"
                    :items="invitableUsers"
                    :filter="inviteNick"
                    @selected="inviteSelected"
                />
            </div>
        </div>

        <div
            v-for="plugin in pluginUiSections"
            :key="plugin.id"
            :class="{'kiwi-aboutbuffer-section--closed': closedSections[plugin.id]}"
            class="kiwi-aboutbuffer-section"
        >
            <h4 @click="toggleSection(plugin.id)">
                <i class="fa fa-angle-right" /> {{ plugin.title() }}
            </h4>
            <component
                :is="plugin.component"
                :plugin-props="{
                    buffer: buffer,
                    aboutbuffer: self,
                }"
                v-bind="plugin.props"
                :network="network"
                :buffer="buffer"
                :sidebar-state="sidebarState"
            />
        </div>
    </div>
</template>

<script>
'kiwi public';

import GlobalApi from '@/libs/GlobalApi';
import toHtml from '@/libs/renderers/Html';
import parseMessage from '@/libs/MessageParser';
import AutoComplete from './AutoComplete';

export default {
    components: {
        AutoComplete,
    },
    props: ['network', 'buffer', 'sidebarState'],
    data() {
        return {
            self: this,
            pluginUiSections: GlobalApi.singleton().aboutBufferPlugins,
            closedSections: {},
            inviteNick: '',
        };
    },
    computed: {
        b() {
            return this.buffer || {};
        },
        formattedTopic() {
            let blocks = parseMessage(this.b.topic || '', { extras: false });
            let content = toHtml(blocks);
            return content;
        },
        highlights() {
            // Tap into buffer.message_count to force vuejs to update this function when
            // it changes
            /* eslint-disable no-unused-vars */
            let tmp = this.buffer.message_count;
            return this.buffer.getMessages()
                .filter((m) => m.isHighlight)
                .filter((m) => m.type !== 'traffic')
                .filter((m) => m.type !== 'topic')
                .filter((m) => m.type !== 'mode')
                .filter((m) => m.html)
                .sort((a, b) => b.time - a.time);
        },
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.network.nick);
        },
        invitableUsers() {
            const wantedBuffer = (userBuffer) => userBuffer.buffer.name === this.buffer.name;
            return Object.values(this.network.users)
                .filter((user) => !Object.values(user.buffers).find(wantedBuffer))
                .map((user) => ({ text: user.nick }));
        },
    },
    methods: {
        toggleSection(section) {
            this.$set(this.closedSections, section, !this.closedSections[section]);
        },
        inviteUser() {
            if (!this.inviteNick) {
                return;
            }
            this.network.ircClient.invite(this.buffer.name, this.inviteNick);
            this.inviteNick = '';
        },
        inviteSelected(value, item) {
            this.inviteNick = value;
        },
        inviteKeyDown(event) {
            if (event.key === 'Tab') {
                this.$refs.autocomplete.selectCurrentItem();
                return;
            }
            this.$refs.autocomplete.handleOnKeyDown(event);
        },
    },
};
</script>

<style lang="less">
/* Adjust the sidebars width when this component is in view */
.kiwi-sidebar.kiwi-sidebar-section-about {
    max-width: 300px;
    width: 300px;
}

.kiwi-aboutbuffer {
    overflow-y: auto;
    box-sizing: border-box;
    min-height: 100px;
    margin: auto;
    width: 100%;
    //Padding bottom is needed, otherwise the scrollbar will show on the right side.
    padding-bottom: 1px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.kiwi-aboutbuffer-invite {
    display: flex;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-aboutbuffer-invite > input {
    flex-grow: 1;
    margin-right: 10px;
}

.kiwi-aboutbuffer-invite-auto-complete {
    position: relative;
    margin-top: 1em;
    bottom: 0;
}

.kiwi-aboutbuffer-invite-auto-complete .kiwi-autocomplete-item {
    padding: 5px 11px;
}

.kiwi-aboutbuffer-highlight {
    cursor: pointer;
}

.kiwi-aboutbuffer h3 {
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-aboutbuffer-section {
    display: block;
    width: 100%;
}

.kiwi-aboutbuffer-section h4 {
    padding: 10px;
    cursor: pointer;
    user-select: none;
}

.kiwi-aboutbuffer-section h4 i {
    margin-right: 5px;
    transition: transform 0.2s;
}

.kiwi-aboutbuffer-section--closed h4 i {
    transform: rotate(90deg);
}

.kiwi-aboutbuffer-section > div {
    padding: 1em;
    transition: max-height 0.2s, padding 0.2s, opacity 0.2s;
    overflow: hidden;
}

.kiwi-aboutbuffer-section .kiwi-aboutbuffer-usercount {
    text-align: center;
}

.kiwi-aboutbuffer-section > div p {
    margin: 0 0 1em 0;
}

.kiwi-aboutbuffer-section > div p:last-of-type {
    margin-bottom: 0;
}

.kiwi-aboutbuffer-section--closed > div {
    max-height: 0;
    padding: 0;
    opacity: 0;
}

@media screen and (max-width: 769px) {
    .kiwi-sidebar.kiwi-sidebar-section-about {
        width: 100%;
        max-width: 100%;
    }
}
</style>
