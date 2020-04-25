<template>
    <div class="kiwi-serverview">
        <div class="kiwi-serverview-inner">
            <tabbed-view ref="tabs" :key="network.id" @changed="tabChanged">
                <tabbed-tab :header="$t('messages')" :focus="hasMessages" name="messages">
                    <message-list :buffer="serverBuffer" />
                </tabbed-tab>
                <tabbed-tab
                    v-if="!restrictedServer"
                    :header="$t('settings')"
                    :focus="!hasMessages"
                    name="settings"
                >
                    <network-settings :network="network" />
                </tabbed-tab>
                <tabbed-tab
                    v-if="networkConnected"
                    :header="$t('channels')"
                    name="channels"
                >
                    <channel-list :network="network" />
                </tabbed-tab>
                <tabbed-tab v-for="item in pluginUiElements" :key="item.id" :header="item.title">
                    <div :is="item.component" v-bind="item.props" />
                </tabbed-tab>
            </tabbed-view>
        </div>
    </div>
</template>

<script>
'kiwi public';

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
            pluginUiElements: GlobalApi.singleton().serverViewPlugins,
        };
    },
    computed: {
        hasMessages() {
            return this.network.serverBuffer().getMessages().length > 0;
        },
        serverBuffer() {
            return this.network.serverBuffer();
        },
        restrictedServer() {
            return this.$state.setting('restricted');
        },
        networkConnected() {
            return this.network.state === 'connected';
        },
    },
    watch: {
        networkConnected() {
            this.$nextTick(() => {
                // Vue won't update the tabs being displayed here so we to
                // manually update a property to force a re-render of the tabs
                this.$refs.tabs.a++;
            });
        },
    },
    created() {
        this.listen(this.$state, 'server.tab.show', (tabName) => {
            this.showTab(tabName);
        });
    },
    methods: {
        showTab(tabName) {
            this.$refs.tabs.setActiveByName(tabName);
        },
        tabChanged(tabName) {
            this.serverBuffer.show_input = (tabName === 'messages');
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
    height: 100%;
    margin: 0;
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
