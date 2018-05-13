<template>
    <div class="kiwi-nicklist">
        <div class="kiwi-nicklist-usercount">
            <span>{{$t('person', {count: sortedUsers.length})}}</span>
        </div>

        <ul class="kiwi-nicklist-users">
            <li
                v-for="user in sortedUsers"
                :key="user.nick"
                class="kiwi-nicklist-user"
                v-bind:class="[
                    userMode(user) ? 'kiwi-nicklist-user--mode-' + userMode(user) : '',
                    user.away ? 'kiwi-nicklist-user--away' : ''
                ]"
                @click="openUserbox(user, $event)"
            >
                <span class="kiwi-nicklist-user-prefix">{{userModePrefix(user)}}</span>
                <span class="kiwi-nicklist-user-nick"
                        v-bind:style="nickStyle(user.nick)"
                        >{{user.nick}}
                </span>
                <span class="kiwi-nicklist-messageuser" @click.stop="openQuery(user)">
                    <i class="fa fa-comment" aria-hidden="true"></i>
                </span>
            </li>
        </ul>

        <div class="kiwi-nicklist-info">
            <input placeholder="Filter users in channel" v-model="user_filter" ref="user_filter">
            <i class="fa fa-search" @click="$refs.user_filter.focus()"></i>
        </div>
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
    data: function data() {
        return {
            userbox_user: null,
            user_filter: '',
        };
    },
    props: ['network', 'buffer', 'users', 'uiState'],
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
            /* eslint-disable guard-for-in */
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
        openUserbox: function openUserbox(user, mouseEvent) {
            state.$emit('userbox.show', user, {
                top: mouseEvent.clientY,
                left: mouseEvent.clientX,
                buffer: this.buffer,
            });
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

@media screen and (max-width: 759px) {
    .kiwi-sidebar.kiwi-sidebar-section-nicklist {
        width: 100%;
        max-width: none;
    }
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
    display: flex;
    width: 100%;
    text-align: center;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.5em 10px;
    cursor: default;
    box-sizing: border-box;

    span {
        font-weight: 600;
        width: 100%;
        text-align: center;
    }
}

.kiwi-nicklist-info {
    float: right;
    width: 100%;
    margin: auto;
    height: 43px;
    box-sizing: border-box;
    position: relative;
    font-size: 0.9em;
    padding-bottom: 0;
    text-align: center;
    display: flex;
    flex-direction: column;

    input {
        text-align: left;
        float: left;
        width: 100%;
        border: none;
        padding: 0 1em;
        height: 43px;
        line-height: 43px;
        font-weight: normal;
        flex: 1;
        background: 0 0;
        outline: 0;
    }

    .fa.fa-search {
        position: absolute;
        top: 50%;
        margin-top: -0.5em;
        color: #000;
        opacity: 0.5;
        line-height: normal;
        font-size: 1.2em;
        right: 20px;
        margin-right: 0;
    }
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

.kiwi-nicklist-messageuser {
    position: absolute;
    content: '\f075';
    right: 1em;
    font-family: fontAwesome, sans-serif;
    top: 50%;
    margin-top: -1.5em;
}

.kiwi-nicklist-messageuser:hover {
    cursor: pointer;
}

.kiwi-nicklist-info i.fa-search {
    flex: 1;
    margin-right: 25px;
    cursor: pointer;
    line-height: 50px;
}

.kiwi-nicklist-user-nick {
    font-weight: bold;
    cursor: pointer;
}

</style>
