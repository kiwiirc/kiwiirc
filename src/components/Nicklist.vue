<template>
    <div class="kiwi-nicklist">
        <div class="kiwi-nicklist-usercount">
            <span v-if="!filterVisible">{{ $t('person', {count: sortedUsers.length}) }}</span>
            <input ref="user_filter" :class="{active: filterVisible }"
                   :placeholder="$t('filter_users')" v-model="user_filter">
            <i class="fa fa-search" @click="toggleUserFilter()"/>
        </div>

        <ul class="kiwi-nicklist-users">
            <li
                v-for="user in sortedUsers"
                :key="user.nick"
                :class="[
                    userMode(user) ? 'kiwi-nicklist-user--mode-' + userMode(user) : '',
                    user.away ? 'kiwi-nicklist-user--away' : ''
                ]"
                class="kiwi-nicklist-user"
                @click="openUserbox(user)"
            >
                <span class="kiwi-nicklist-user-prefix">{{ userModePrefix(user) }}</span>
                <span :style="nickStyle(user.nick)"
                      class="kiwi-nicklist-user-nick"
                >{{ user.nick }}
                </span>
                <span class="kiwi-nicklist-messageuser" @click.stop="openQuery(user)">
                    <i class="fa fa-comment" aria-hidden="true"/>
                </span>
            </li>
        </ul>
    </div>
</template>

<script>

import state from '@/libs/state';
import Logger from '@/libs/Logger';
import * as TextFormatting from '@/helpers/TextFormatting';
import * as Misc from '@/helpers/Misc';

let log = Logger.namespace('Nicklist');

// Hot function, so it's here for easier caching
function strCompare(a, b) {
    if (a === b) {
        return 0;
    }
    return a > b ?
        1 :
        -1;
}

export default {
    props: ['network', 'buffer', 'uiState'],
    data: function data() {
        return {
            userbox_user: null,
            user_filter: '',
            filterVisible: false,
        };
    },
    computed: {
        sortedUsers: function sortedUsers() {
            // Get a list of network prefixes and give them a rank number
            let netPrefixes = this.network.ircClient.network.options.PREFIX;
            let prefixOrders = Object.create(null);
            netPrefixes.forEach((prefix, idx) => {
                prefixOrders[prefix.mode] = idx;
            });

            // A few things here:
            // * Since vuejs will sort in-place and update views when .sort is called
            //   on an array, clone it first so that we have a plain array to sort
            // * Keep a map of lowercased nicks to we don't need to call .toLowerCase()
            //   on each one all the time. This is a hot function!
            let nickMap = Object.create(null);
            let users = [];
            let bufferUsers = this.buffer.users;
            let nickFilter = this.user_filter.toLowerCase();
            /* eslint-disable guard-for-in, no-restricted-syntax */
            for (let lowercaseNick in bufferUsers) {
                let user = bufferUsers[lowercaseNick];
                nickMap[user.nick] = lowercaseNick;
                if (!nickFilter || lowercaseNick.indexOf(nickFilter) !== -1) {
                    users.push(user);
                }
            }

            let bufferId = this.buffer.id;
            return users.sort((a, b) => {
                let bufferA = a.buffers[bufferId];
                let bufferB = b.buffers[bufferId];

                if (!bufferA) {
                    let msg = 'Nicklist.sortedUsers() User A does not have the buffer in its list!';
                    log.error(msg, a.nick, a.buffers);
                    return -1;
                }
                if (!bufferB) {
                    let msg = 'Nicklist.sortedUsers() User B does not have the buffer in its list!';
                    log.error(msg, b.nick, b.buffers);
                    return 1;
                }

                let modesA = bufferA.modes;
                let modesB = bufferB.modes;

                // Neither user has a prefix, compare text
                if (
                    modesA.length === 0 &&
                    modesB.length === 0
                ) {
                    return strCompare(nickMap[a.nick], nickMap[b.nick]);
                }

                // Compare via prefixes..
                if (
                    modesA.length > 0 &&
                    modesB.length === 0
                ) {
                    return -1;
                }

                if (
                    modesA.length === 0 &&
                    modesB.length > 0
                ) {
                    return 1;
                }

                // Both users have a prefix so find the highest ranking one
                let aP = prefixOrders[modesA[0]];
                let bP = prefixOrders[modesB[0]];
                if (aP > bP) {
                    return 1;
                } else if (aP < bP) {
                    return -1;
                }

                // Prefixes are the same, resort to comparing text
                return strCompare(nickMap[a.nick], nickMap[b.nick]);
            });
        },
        useColouredNicks: function useColouredNicks() {
            return this.buffer.setting('coloured_nicklist');
        },
    },
    methods: {
        nickStyle: function nickStyle(nick) {
            let styles = {};
            if (this.useColouredNicks) {
                styles.color = TextFormatting.createNickColour(nick);
            }
            return styles;
        },
        userModePrefix: function userModePrefix(user) {
            return Misc.userModePrefix(user, this.buffer);
        },
        userMode: function userMode(user) {
            return Misc.userMode(user, this.buffer);
        },
        openQuery: function openQuery(user) {
            let buffer = state.addBuffer(this.buffer.networkid, user.nick);
            state.setActiveBuffer(buffer.networkid, buffer.name);
            this.uiState.close();
        },
        openUserbox: function openUserbox(user) {
            state.$emit('userbox.show', user, {
                buffer: this.buffer,
            });
        },
        toggleUserFilter: function toggleUserFilter() {
            this.filterVisible = !this.filterVisible;
            if (this.filterVisible) {
                this.$refs.user_filter.focus();
            }
        },
    },
};
</script>

<style lang="less">

/* Adjust the sidebars width when this nicklist is in view */
.kiwi-sidebar.kiwi-sidebar-section-nicklist {
    max-width: 250px;
    width: 250px;
}

.kiwi-nicklist {
    overflow: hidden;
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

.kiwi-nicklist-usercount {
    display: block;
    width: 100%;
    cursor: default;
    box-sizing: border-box;
    position: relative;
    height: 43px;
}

.kiwi-nicklist-usercount span {
    position: absolute;
    left: 15px;
    top: 0;
    font-weight: 600;
    line-height: 44px;
}

.kiwi-nicklist-usercount .fa-search {
    position: absolute;
    right: 15px;
    top: 0;
    opacity: 0.8;
    cursor: pointer;
    line-height: 42px;
    font-size: 1.2em;
}

.kiwi-nicklist-usercount .fa-search:hover {
    opacity: 1;
}

.kiwi-nicklist-usercount input {
    text-align: left;
    width: 0%;
    border: none;
    height: 44px;
    font-weight: normal;
    background: none;
    outline: 0;
    padding: 0 15px;
    opacity: 0;
    box-sizing: border-box;
    transition: all 0.2s;
}

.kiwi-nicklist-usercount input.active {
    width: 100%;
    opacity: 1;
    transition: all 0.1s;
}

.kiwi-nicklist-users {
    width: 100%;
    padding: 0;
    margin: 0;
    overflow-y: scroll;
    overflow-x: hidden;
    box-sizing: border-box;
    max-height: 100%;
    flex: 1 auto;
    list-style: none;
    line-height: 1.2em;
}

.kiwi-nicklist-user {
    line-height: 40px;
    padding: 0 1em;
    margin: 0;
    position: relative;
    box-sizing: border-box;
    transition: background 0.3s;
}

.kiwi-nicklist-user-nick {
    font-weight: bold;
    cursor: pointer;
}

.kiwi-nicklist-messageuser {
    position: absolute;
    content: '\f075';
    right: 1em;
    font-family: fontAwesome, sans-serif;
    top: 50%;
    margin-top: -1.5em;
    opacity: 0;
}

.kiwi-nicklist-messageuser:hover {
    cursor: pointer;
}

.kiwi-nicklist-user:hover .kiwi-nicklist-messageuser {
    opacity: 1;
    transition: all 0.3s;
}

@media screen and (max-width: 759px) {
    .kiwi-sidebar.kiwi-sidebar-section-nicklist {
        width: 100%;
        max-width: 380px;
    }
}

</style>
