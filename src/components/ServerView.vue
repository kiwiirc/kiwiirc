<template>
    <div class="kiwi-serverview">
        <div class="kiwi-serverview-inner">
            <tabbed-view :key="network.id" :active-tab="activeTab">
                <tabbed-tab :header="'Messages'" :focus="hasMessages" name="messages">
                    <message-list :buffer="serverBuffer" :messages="serverBuffer.getMessages()"/>
                </tabbed-tab>
                <tabbed-tab
                    v-if="!restrictedServer"
                    :header="$t('settings')"
                    :focus="!hasMessages"
                    name="settings"
                >
                    <network-settings :network="network"/>
                </tabbed-tab>
                <tabbed-tab
                    v-if="network.state==='connected'"
                    :header="$t('channels')"
                    name="channels"
                >
                    <channel-list :network="network"/>
                </tabbed-tab>
                <tabbed-tab v-for="item in pluginUiElements" :key="item.id" :header="item.title">
                    <div :is="item.component" v-bind="item.props"/>
                </tabbed-tab>
            </tabbed-view>
        </div>
    </div>
</template>

<script>

import state from '@/libs/state';
import GlobalApi from '@/libs/GlobalApi';
import MessageList from './MessageList';
import NetworkSettings from './NetworkSettings';
import ChannelList from './ChannelList';

export default {
    components: {
        MessageList,
        NetworkSettings,
        ChannelList,
    },
    props: ['network'],
    data: function data() {
        return {
            activeTab: '',
            pluginUiElements: GlobalApi.singleton().serverViewPlugins,
        };
    },
    computed: {
        hasMessages: function hasMessages() {
            return this.network.serverBuffer().getMessages().length > 0;
        },
        serverBuffer: function serverBuffer() {
            return this.network.serverBuffer();
        },
        restrictedServer() {
            return state.setting('restricted');
        },
    },
    created() {
        this.listen(state, 'server.tab.show', (tabName) => {
            this.showTab(tabName);
        });
    },
    methods: {
        showTab(tabName) {
            this.activeTab = tabName;
        },
    },
};
</script>

<style>

.kiwi-serverview {
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
}

.kiwi-serverview .kiwi-messagelist {
    padding-top: 0;
}

.kiwi-serverview-inner {
    /* Mobile safari can't work out the height for scrolling to work without this wrapper element */
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
}

.kiwi-serverview-alerts {
    margin-bottom: 1em;
}

</style>
