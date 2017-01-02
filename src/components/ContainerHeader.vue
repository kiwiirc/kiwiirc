<template>
    <div class="kiwi-header">
        <template v-if="isChannel()">
            <div class="kiwi-header-name">{{buffer.name}}</div>
            <div class="kiwi-header-topic" v-html="formatMessage(buffer.topic)"></div>
            <div v-if="!buffer.joined">
                <a @click="joinCurrentBuffer" class="u-link">Join Channel</a>
            </div>
        </template>
        <template v-else-if="isServer()">
            <div class="kiwi-header-name">{{buffer.getNetwork().name}}</div>
            <a
                class="kiwi-header-server-settings u-link"
                @click="showNetworkSettings(buffer.getNetwork())"
            >
                <i class="fa fa-cog" aria-hidden="true"></i>
            </a>

            <div v-if="buffer.getNetwork().state === 'disconnected'" class="kiwi-header-server-connection">
                Not connected.
                <a @click="buffer.getNetwork().ircClient.connect()" class="u-link">Connect</a>
            </div>
            <div v-else-if="buffer.getNetwork().state === 'connecting'" class="kiwi-header-server-connection">
                Connecting...
            </div>
        </template>
        <template v-else-if="isQuery()">
            <div class="kiwi-header-name">Private conversation with {{buffer.name}}</div>
        </template>
    </div>
</template>

<script>

import state from 'src/libs/state';
import NetworkSettings from './NetworkSettings';
import * as TextFormatting from 'src/helpers/TextFormatting';

export default {
    data: function data() {
        return {
        };
    },
    props: ['buffer'],
    methods: {
        formatMessage: function formatMessage(messageBody) {
            let formatted = TextFormatting.ircCodesToHtml(messageBody);
            formatted = TextFormatting.linkifyUrls(formatted);
            return formatted;
        },
        isChannel: function isChannel() {
            return this.buffer.isChannel();
        },
        isServer: function isServer() {
            return this.buffer.isServer();
        },
        isQuery: function isQuery() {
            return this.buffer.isQuery();
        },
        showNetworkSettings: function showNetworkSettings(network) {
            state.$emit('active.component', NetworkSettings, {
                network,
            });
        },
        joinCurrentBuffer: function joinCurrentBuffer() {
            let network = this.buffer.getNetwork();
            network.ircClient.join(this.buffer.name);
        },
    },
};

</script>

<style>
.kiwi-header {
    box-sizing: border-box;
}
.kiwi-header-name {
    display: inline-block;
}
.kiwi-header-server-settings {
    display: inline;
}
.kiwi-header-server-connection {
    display: block;
}
</style>
