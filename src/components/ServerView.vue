<template>
    <div class="kiwi-serverview">
        <tabbed-view :key="network.id">
            <tabbed-tab :header="'Messages'" :focus="hasMessages">
                <message-list :buffer="serverBuffer" :messages="serverBuffer.getMessages()"></message-list>
            </tabbed-tab>
            <tabbed-tab :header="$t('settings')" :focus="!hasMessages">
                <network-settings :network="network"></network-settings>
            </tabbed-tab>
            <tabbed-tab :header="'Channels'" v-if="network.state==='connected'">
                <channel-list :network="network"></channel-list>
            </tabbed-tab>
        </tabbed-view>
    </div>
</template>

<script>

import MessageList from './MessageList';
import NetworkSettings from './NetworkSettings';
import NetworkSettingsAdvanced from './NetworkSettingsAdvanced';
import ChannelList from './ChannelList';

export default {
    data: function data() {
        return {
        };
    },
    props: ['network'],
    components: {
        MessageList,
        NetworkSettings,
        NetworkSettingsAdvanced,
        ChannelList,
    },
    computed: {
        hasMessages: function hasMessages() {
            return this.network.serverBuffer().getMessages().length > 0;
        },
        serverBuffer: function serverBuffer() {
            return this.network.serverBuffer();
        },
    },
};
</script>

<style>

.kiwi-serverview {
    box-sizing: border-box;
    overflow: hidden;
}
.kiwi-serverview-alerts {
    margin-bottom: 1em;
}

</style>
