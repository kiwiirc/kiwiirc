<template>
    <div class="kiwi-nicklist">
        <span class="kiwi-nicklist-options" @click="settings_open = !settings_open">
            <i class="fa fa-cog" aria-hidden="true"></i>
        </span>
        <div v-if="settings_open" class="kiwi-nicklist-settings">
            <label>Show when people join <input type="checkbox" v-model="settingShowJoinParts"></label> <br />
            <label>Nick colours in the list <input type="checkbox" v-model="settingColouredNicklist"></label>
        </div>
        <div class="kiwi-nicklist-info">{{buffer.users.length}} {{buffer.users.length!=1?'people':'person'}} here</div>
        <ul class="kiwi-nicklist-users">
            <li
                v-for="user in sortedUsers"
                class="kiwi-nicklist-user"
            >
                <span class="kiwi-nicklist-user-prefix">{{userModePrefix(user)}}</span><span
                    class="kiwi-nicklist-user-nick"
                    @click="openUserbox(user, $event)"
                    v-bind:style="nickStyle(user.nick)"
                >{{user.nick}}</span>
            </li>
        </ul>
    </div>
</template>


<script>

import _ from 'lodash';
import state from 'src/libs/state';
import * as TextFormatting from 'src/helpers/TextFormatting';

export default {
    data: function data() {
        return {
            settings_open: false,
            userbox_user: null,
        };
    },
    props: ['network', 'buffer', 'users'],
    computed: {
        settingShowJoinParts: {
            get: function getSettingShowJoinParts() {
                return this.buffer.setting('show_joinparts');
            },
            set: function setSettingShowJoinParts(newVal) {
                return this.buffer.setting('show_joinparts', newVal);
            },
        },
        settingColouredNicklist: {
            get: function getSettingShowJoinParts() {
                return this.buffer.setting('coloured_nicklist');
            },
            set: function setSettingShowJoinParts(newVal) {
                return this.buffer.setting('coloured_nicklist', newVal);
            },
        },
        sortedUsers: function sortedUsers() {
            // Get a list of network prefixes and give them a rank number
            let netPrefixes = this.network.ircClient.network.options.PREFIX;
            let prefixOrders = Object.create(null);
            netPrefixes.forEach((prefix, idx) => {
                prefixOrders[prefix.mode] = idx;
            });

            // Since vuejs will sort in-place and update views when .sort is called
            // on an array, clone it first so that we have a plain array to sort
            let users = this.buffer.users.map(b => b);

            let bufferId = this.buffer.id;
            return users.sort((a, b) => {
                // Neither user has a prefix, compare text
                if (
                    a.buffers[bufferId].modes.length === 0 &&
                    b.buffers[bufferId].modes.length === 0
                ) {
                    return a.nick.localeCompare(b.nick);
                }

                // Compare via prefixes..
                if (
                    a.buffers[bufferId].modes.length > 0 &&
                    b.buffers[bufferId].modes.length === 0
                ) {
                    return -1;
                }

                if (
                    a.buffers[bufferId].modes.length === 0 &&
                    b.buffers[bufferId].modes.length > 0
                ) {
                    return 1;
                }

                // Both users have a prefix so find the highest ranking one
                let aP = prefixOrders[a.buffers[bufferId].modes];
                let bP = prefixOrders[b.buffers[bufferId].modes];
                if (aP > bP) {
                    return 1;
                } else if (aP < bP) {
                    return -1;
                }

                // Prefixes are the same, resort to comparing text
                return a.nick.localeCompare(b.nick);
            });
        },
    },
    methods: {
        nickStyle: function nickColour(nick) {
            let styles = {};
            if (this.settingColouredNicklist) {
                styles.color = TextFormatting.createNickColour(nick);
            }
            return styles;
        },
        userModePrefix: function userModePrefix(user) {
            let modes = user.buffers[this.buffer.id].modes;
            if (modes.length === 0) {
                return '';
            }

            let netPrefixes = this.network.ircClient.network.options.PREFIX;
            let prefix = _.find(netPrefixes, { mode: modes[0] });
            return prefix ?
                prefix.symbol :
                '';
        },
        userMode: function userMode(user) {
            let modes = user.buffers[this.buffer.id].modes;
            return modes.length === 0 ?
                '' :
                modes[0];
        },
        openQuery: function openQuery(user) {
            let buffer = state.addBuffer(this.buffer.networkid, user.nick);
            state.setActiveBuffer(buffer.networkid, buffer.name);
        },
        openUserbox: function openUserbox(user, mouseEvent) {
            state.$emit('userbox.show', user, {
                top: mouseEvent.clientY,
                left: mouseEvent.clientX,
            });
        },
    },
};
</script>


<style>
.kiwi-nicklist {
    overflow: hidden;
    box-sizing: border-box;
    overflow-y: auto;
}
.kiwi-nicklist-options {
    display: block;
    margin: 3px 10px;
    text-align: right;
    cursor: pointer;
}
.kiwi-nicklist-users {
    list-style: none;
}
</style>
