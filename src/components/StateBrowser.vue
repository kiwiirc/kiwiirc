<template>
    <div class="kiwi-statebrowser">
        <div
            v-if="bufferForPopup"
            class="kiwi-statebrowser-channel-popup"
            v-bind:style="{
                top: popup_top + 'px'
            }"
            @click.stop=""
        >
            <buffer-settings v-bind:buffer="bufferForPopup"></buffer-settings>
        </div>

        <div class="kiwi-statebrowser-scrollarea">
            <div class="kiwi-statebrowser-networks">
                <state-browser-network
                    v-for="network in networks"
                    :network="network"
                    @showBufferSettings="showBufferPopup"
                ></state-browser-network>
            </div>

            <div class="kiwi-statebrowser-options">
                <a @click="clickAddNetwork" v-if="!isRestrictedServer">Add network</a>
                <a @click="clickAppSettings">Settings</a>
                <a @click="clickForget" v-if="isPersistingState">Forget Me</a>
            </div>
        </div>
    </div>
</template>

<script>

import state from 'src/libs/state';
import StateBrowserNetwork from './StateBrowserNetwork';
import AppSettings from './AppSettings';
import NetworkSettings from './NetworkSettings';
import BufferSettings from './BufferSettings';

export default {
    data: function data() {
        return {
            // Name of the buffer that should show its popup
            popup_buffername: null,
            popup_networkid: null,
            popup_top: 0,
            new_channel_input: '',
        };
    },
    props: ['networks'],
    components: {
        BufferSettings,
        StateBrowserNetwork,
    },
    methods: {
        showBufferPopup: function showBufferPopup(buffer, domY) {
            if (!buffer) {
                this.popup_buffername = null;
                this.popup_networkid = null;
                this.popup_top = 0;
            } else {
                this.popup_buffername = buffer.name;
                this.popup_networkid = buffer.networkid;
                this.popup_top = domY;
            }
        },
        onNewChannelInputFocus: function onNewChannelInputFocus() {
            // Auto insert the # if no value is already in. Easier for mobile users
            if (!this.new_channel_input) {
                this.new_channel_input = '#';
            }
        },
        onNewChannelInputBlur: function onNewChannelInputBlur() {
            // Remove the # since we may have auto inserted it as they tabbed past
            if (this.new_channel_input === '#') {
                this.new_channel_input = '';
            }
        },
        clickAddNetwork: function clickAddNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork('New Network', nick, {});
            state.$emit('active.component', NetworkSettings, {
                network,
            });
        },
        clickAppSettings: function clickAppSettings() {
            state.$emit('active.component', AppSettings);
        },
        clickForget: function clickForget() {
            let msg = 'This will delete all stored networks and start fresh. Are you sure?';
            let confirmed = confirm(msg);
            if (!confirmed) {
                return;
            }

            state.persistence.forgetState();
        },
    },
    computed: {
        bufferForPopup: function bufferForPopup() {
            if (!this.popup_buffername || !this.popup_networkid) {
                return false;
            }

            return state.getBufferByName(this.popup_networkid, this.popup_buffername);
        },
        isPersistingState: function isPersistingState() {
            return !!state.persistence;
        },
        isRestrictedServer: function isRestrictedServer() {
            return !!state.settings.restricted;
        },
    },
    created: function created() {
        state.$on('document.clicked', () => {
            this.showBufferPopup(null);
        });
    },
};
</script>

<style>
.kiwi-statebrowser {
    box-sizing: border-box;
    z-index: 3; /* Must be at leats 1 higher than the workspace :after z-index; */
}

.kiwi-statebrowser-scrollarea {
    overflow: auto;
    height: 100%;
    width: 100%;
}
.kiwi-statebrowser-networks {
    padding-bottom: 60px; /* .kiwi-statebrowser-options height+padding */
}
.kiwi-statebrowser-channel {
    position: relative;
    display: flex;
}
.kiwi-statebrowser-channel-name {
    flex: 1;
}

.kiwi-statebrowser-channel-settings {
    display: none;
}
.kiwi-statebrowser-channel:hover .kiwi-statebrowser-channel-settings {
    display: inline-block;
}
.kiwi-statebrowser-channel-popup {
    display: block;
    position: absolute;
    left: 100%;
    width: 100%;
}

.kiwi-statebrowser-options {
    position: absolute;
    bottom: 0;
    padding: 15px;
    height: 30px;
}
</style>
