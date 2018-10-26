<template>
    <div class="kiwi-aboutbuffer">
        <h3>{{ b.name }}</h3>

        <div class="kiwi-aboutbuffer-section">
            <h4><i class="fa fa-angle-right"/> About</h4>
            <div>
                <p v-if="b.topic" v-html="formattedTopic"/>
                <p v-else>There is no topic for this channel</p>

                <p>
                    <a class="u-link" @click="sidebarState.showNicklist()">
                        {{ $t('person', {count: Object.keys(b.users || {}).length}) }}
                    </a>
                </p>
            </div>
        </div>

        <div class="kiwi-aboutbuffer-section">
            <h4><i class="fa fa-angle-right"/> Highlights</h4>
            <div>
                <ul v-if="highlights.length > 0" class="display:none;">
                    <li v-for="msg in highlights" :key="msg.id">
                        {{ msg.nick }}: {{ msg.message }}
                    </li>
                </ul>
                <p v-else>Nobody has mentioned you yet...</p>
            </div>
        </div>

        <div
            v-for="plugin in pluginUiSections"
            :key="plugin.id"
            class="kiwi-aboutbuffer-section"
        >
            <h4><i class="fa fa-angle-right"/> {{ plugin.args.title }}</h4>
            <div v-rawElement="plugin.el" />
        </div>
    </div>
</template>

<script>

'kiwi public';

import GlobalApi from '@/libs/GlobalApi';
import formatIrcMessage from '@/libs/MessageFormatter';
import * as TextFormatting from '@/helpers/TextFormatting';

export default {
    props: ['network', 'buffer', 'sidebarState'],
    data() {
        return {
            pluginUiSections: GlobalApi.singleton().aboutBufferPlugins,
        };
    },
    computed: {
        b() {
            return this.buffer || {};
        },

        formattedTopic() {
            let showEmoticons = this.$state.setting('buffers.show_emoticons');
            let blocks = formatIrcMessage(this.b.topic || '', { extras: false });
            let content = TextFormatting.styleBlocksToHtml(blocks, showEmoticons, null);
            return content.html;
        },

        highlights() {
            // Tap into buffer.message_count to force vuejs to update this function when
            // it changes
            /* eslint-disable no-unused-vars */
            let tmp = this.buffer.message_count;
            return this.buffer.getMessages()
                .filter(m => m.isHighlight)
                .filter(m => m.type !== 'traffic')
                .filter(m => m.type !== 'mode');
        },
    },
    methods: {
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

.kiwi-aboutbuffer h3 {
    padding: 10px;
    background: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.71);
    width: 100%;
    box-sizing: border-box;
}

.kiwi-aboutbuffer-section {
    display: block;
    width: 100%;
    margin-top: 1em;
}

.kiwi-aboutbuffer-section:first-of-type {
    margin-top: 0;
}

.kiwi-aboutbuffer-section h4 {
    padding: 10px;
}

.kiwi-aboutbuffer-section h4 i {
    margin-right: 5px;
}

.kiwi-aboutbuffer-section > div {
    padding: 0 1em;
}

</style>
