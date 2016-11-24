<template>
    <div class="kiwi-nicklist">
        <span class="kiwi-nicklist-usercount" @click="settings_open = !settings_open">Users in {{buffer.name}}</span>
        <div v-if="settings_open" class="kiwi-nicklist-settings">
            <label>Show when people join <input type="checkbox" v-model="settingShowJoinParts"></label> <br />
            <label>Nick colours in the list <input type="checkbox" v-model="settingColouredNicklist"></label>
        </div>
        <div class="kiwi-nicklist-info">{{buffer.users.length}} {{buffer.users.length>1?'people':'person'}} here</div>
        <ul class="kiwi-nicklist-users">
            <li v-for="user in sortedUsers" class="kiwi-nicklist-user">
                <span
                    v-if="users[user]"
                    class="kiwi-nicklist-user-nick"
                    @click="openQuery(users[user])"
                    v-bind:style="nickStyle(users[user].nick)"
                >
                    {{users[user].nick}}
                </span>
            </li>
        </ul>
    </div>
</template>


<script>

import state from 'src/libs/state';
import * as TextFormatting from 'src/helpers/TextFormatting';

export default {
    data: function data() {
        return {
            settings_open: false,
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
            console.log('Building user list');
            // Since vuejs will sort in-place and update views when .sort is called
            // on an array, clone it first so that we have a plain array to sort
            let users = this.buffer.users.map(b => b);
            return users.sort((a, b) => a.localeCompare(b));
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
        openQuery: function openQuery(user) {
            let buffer = state.addBuffer(this.buffer.networkid, user.nick);
            state.setActiveBuffer(buffer);
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
.kiwi-nicklist-usercount {
    font-weight: bold;
    cursor: pointer;
}
.kiwi-nicklist-users {
    list-style: none;
}
</style>
