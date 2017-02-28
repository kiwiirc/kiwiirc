<template>
    <div
        class="kiwi-header"
        v-bind:class="{
            'kiwi-header--showall': buffer_settings_open,
        }"
        @click="onHeaderClick"
    >

        <template v-if="isChannel()">
            <div class="kiwi-header-options">
                <a
                    class="u-button u-button-secondary"
                    @click="buffer_settings_open=!buffer_settings_open"
                ><i class="fa fa-wrench" aria-hidden="true"></i></a>
            </div>
            <div class="kiwi-header-name">{{buffer.name}}</div>
            <div class="kiwi-header-topic" v-html="formatMessage(buffer.topic)"></div>
            <div v-if="buffer.getNetwork().state === 'connected' && !buffer.joined">
                <a @click="joinCurrentBuffer" class="u-link">Join Channel</a>
            </div>
        </template>
        <template v-else-if="isServer()">
            <div class="kiwi-header-options">
                <a
                    class="u-button u-button-secondary"
                    @click="showNetworkSettings(buffer.getNetwork())"
                ><i class="fa fa-wrench" aria-hidden="true"></i></a>
            </div>
            <div class="kiwi-header-name">{{buffer.getNetwork().name}}</div>

            <div v-if="buffer.getNetwork().state === 'disconnected'" class="kiwi-header-server-connection">
                Not connected.
                <a @click="buffer.getNetwork().ircClient.connect()" class="u-link">Connect</a>
            </div>
            <div v-else-if="buffer.getNetwork().state === 'connecting'" class="kiwi-header-server-connection">
                Connecting...
            </div>
        </template>
        <template v-else-if="isQuery()">
            <div class="kiwi-header-options">
                <a class="u-button u-button-secondary" @click="closeCurrentBuffer">Close</a>
            </div>
            <div class="kiwi-header-name">Private conversation with {{buffer.name}}</div>
        </template>

        <div
            v-if="buffer_settings_open"
            class="kiwi-header-buffersettings"
            @click.stop=""
        >
            <buffer-settings v-bind:buffer="buffer"></buffer-settings>
            <a @click="buffer_settings_open=false" class="u-button u-button-secondary kiwi-header-close-buffersettings">
                <i class="fa fa-caret-up" aria-hidden="true"></i>
            </a>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import state from 'src/libs/state';
import NetworkSettings from './NetworkSettings';
import BufferSettings from './BufferSettings';
import * as TextFormatting from 'src/helpers/TextFormatting';

export default {
    data: function data() {
        return {
            buffer_settings_open: false,
        };
    },
    props: ['buffer'],
    components: {
        BufferSettings,
    },
    methods: {
        formatMessage: function formatMessage(messageBody) {
            let words = messageBody.split(' ');
            words = words.map(word => {
                let parsed;

                parsed = TextFormatting.linkifyUrls(word, {
                    addHandle: true,
                    handleClass: 'fa fa-chevron-right kiwi-messagelist-message-linkhandle',
                });
                if (parsed !== word) return parsed;

                parsed = TextFormatting.linkifyChannels(word);
                if (parsed !== word) return parsed;

                return _.escape(word);
            });

            let parsed = words.join(' ');
            parsed = TextFormatting.ircCodesToHtml(parsed);

            return parsed;
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
        closeCurrentBuffer: function closeCurrentBuffer() {
            state.removeBuffer(this.buffer);
        },
        onHeaderClick: function onHeaderClick(event) {
            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName) {
                let network = this.buffer.getNetwork();
                state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
            }
        },
    },
    watch: {
        buffer: function watchBuffer() {
            // When ever the buffer changes, close the settings dropdown
            this.buffer_settings_open = false;
        },
    },
};

</script>

<style>
.kiwi-header {
    box-sizing: border-box;
    z-index: 2;
}
.kiwi-header--showall {
    height: auto;
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
.kiwi-header-options {
    display: inline-block;
    float: right;
    margin-top: 4px;
    margin-right: 4px;
}
.kiwi-header-close-buffersettings {
    float: right;
}
</style>
