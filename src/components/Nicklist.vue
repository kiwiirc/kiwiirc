<template>
    <div
        :class="{
            'kiwi-nicklist--filtering': userFilterVisible,
            'kiwi-nicklist--avatars': shouldShowAvatars,
        }"
        class="kiwi-nicklist"
    >
        <div class="kiwi-nicklist-filter" @click="toggleUserFilter">
            <div class="kiwi-nicklist-usercount">
                {{
                    userFilterVisible
                        ? sortedUsers.length
                        : $t('person', { count: sortedUsers.length })
                }}
            </div>
            <input
                ref="user_filter"
                v-model="userFilter"
                :placeholder="$t('filter_users')"
                @click.stop
                @blur="onFilterBlur"
            >
            <i class="fa fa-search" aria-hidden="true" />
            <div class="kiwi-nicklist-usercount-width">
                {{ allUsersCount }}
            </div>
        </div>
        <RecycleScroller
            :items="sortedUsers"
            :item-size="shouldShowAvatars ? 38 : 26"
            :key-field="'id'"
            class="kiwi-nicklist-users"
        >
            <template #default="{ item }">
                <nicklist-user :key="item.id" :user="item" :nicklist="self" :network="network" />
            </template>
        </RecycleScroller>
    </div>
</template>

<script>
'kiwi public';

import Logger from '@/libs/Logger';
import * as Misc from '@/helpers/Misc';

import NicklistUser from './NicklistUser';

const log = Logger.namespace('Nicklist');

export default {
    components: {
        NicklistUser,
    },
    props: ['network', 'buffer', 'sidebarState'],
    data() {
        return {
            self: this,
            userFilter: '',
            userFilterVisible: false,
        };
    },
    computed: {
        sortedUsers() {
            // Get a list of network prefixes and give them a rank number
            const netPrefixes = this.network.ircClient.network.options.PREFIX;
            const prefixOrders = Object.create(null);
            netPrefixes.forEach((prefix, idx) => {
                prefixOrders[prefix.mode] = idx;
            });

            // A few things here:
            // * Since vuejs will sort in-place and update views when .sort is called
            //   on an array, clone it first so that we have a plain array to sort
            // * Keep a map of uppercase nicks to we don't need to call .toUpperCase()
            //   on each one all the time. This is a hot function!
            const nickMap = Object.create(null);
            const users = [];
            const bufferUsers = this.buffer.users;
            const nickFilter = this.userFilter.toUpperCase();

            Object.entries(bufferUsers).forEach(([uppercaseNick, user]) => {
                nickMap[user.nick] = uppercaseNick;
                if (!nickFilter || uppercaseNick.indexOf(nickFilter) !== -1) {
                    users.push(user);
                }
            });

            const bufferId = this.buffer.id;
            const groupAway = this.$state.setting('nicklistGroupAway');
            return users.sort((a, b) => {
                const bufferA = a.buffers[bufferId];
                const bufferB = b.buffers[bufferId];

                if (!bufferA) {
                    const msg = 'Nicklist.sortedUsers() User A does not have the buffer in its list!';
                    log.error(msg, a.nick, a.buffers);
                    return -1;
                }
                if (!bufferB) {
                    const msg = 'Nicklist.sortedUsers() User B does not have the buffer in its list!';
                    log.error(msg, b.nick, b.buffers);
                    return 1;
                }

                const modesA = bufferA.modes;
                const modesB = bufferB.modes;

                // Neither user has a prefix, compare text
                if (modesA.length === 0 && modesB.length === 0) {
                    // Compare away status
                    if (groupAway) {
                        if (a.away && !b.away) {
                            return 1;
                        }
                        if (!a.away && b.away) {
                            return -1;
                        }
                    }

                    return Misc.strCompare(nickMap[a.nick], nickMap[b.nick]);
                }

                // Compare via prefixes..
                if (modesA.length > 0 && modesB.length === 0) {
                    return -1;
                }

                if (modesA.length === 0 && modesB.length > 0) {
                    return 1;
                }

                // Both users have a prefix so find the highest ranking one
                const aP = prefixOrders[this.buffer.userMode(a)];
                const bP = prefixOrders[this.buffer.userMode(b)];
                if (aP > bP) {
                    return 1;
                } else if (aP < bP) {
                    return -1;
                }

                // Prefixes are the same, compare away status
                if (groupAway) {
                    if (a.away && !b.away) {
                        return 1;
                    }
                    if (!a.away && b.away) {
                        return -1;
                    }
                }

                // Prefixes are the same, resort to comparing text
                return Misc.strCompare(nickMap[a.nick], nickMap[b.nick]);
            });
        },
        allUsersCount() {
            return Object.keys(this.buffer.users).length;
        },
        shouldShowAvatars() {
            return this.buffer.setting('nicklist_avatars');
        },
        useColouredNicks() {
            return this.buffer.setting('coloured_nicklist');
        },
    },
    methods: {
        openQuery(user) {
            const buffer = this.$state.addBuffer(this.buffer.networkid, user.nick);
            this.$state.setActiveBuffer(buffer.networkid, buffer.name);
            if (this.$state.ui.is_narrow) {
                this.sidebarState.close();
            }
        },
        openUserbox(user) {
            this.$state.$emit('userbox.show', user, {
                buffer: this.buffer,
            });
        },
        toggleUserFilter() {
            this.userFilterVisible = !this.userFilterVisible;
            if (this.userFilterVisible) {
                this.$nextTick(() => this.$refs.user_filter.focus());
            } else {
                this.userFilter = '';
            }
        },
        onFilterBlur() {
            if (!this.userFilter.trim()) {
                this.userFilter = '';
                this.userFilterVisible = false;
            }
        },
    },
};
</script>

<style lang="less">
// Adjust the sidebars width when this nicklist is in view
.kiwi-container .kiwi-sidebar.kiwi-sidebar-section-nicklist {
    width: 250px;
    max-width: 250px;

    @media screen and (max-width: 769px) {
        width: 100%;
        max-width: 300px;
    }
}

.kiwi-nicklist {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.kiwi-nicklist-filter {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: 100% 0;
    grid-template-columns: max-content auto max-content;
    align-items: center;
    width: 100%;
    cursor: pointer;
    min-height: 42px;
    padding: 0 12px;
    border-bottom: 1px solid;

    > div {
        overflow: hidden;
        font-weight: 600;
        white-space: nowrap;
    }

    .kiwi-nicklist-usercount {
        grid-column: span 2;

        .kiwi-nicklist--filtering & {
            grid-column: span 1;
        }
    }

    input {
        box-sizing: border-box;
        display: none;
        width: 100%;
        height: 100%;
        padding: 0 8px;
        font-weight: normal;
        background: none;
        border: none;
        outline: 0;

        .kiwi-nicklist--filtering & {
            display: block;
        }
    }

    .fa-search {
        font-size: 1.2em;
        opacity: 0.3;
        transition: opacity 0.3s;

        &:hover,
        .kiwi-nicklist--filtering & {
            opacity: 1;
        }
    }

    .kiwi-nicklist-usercount-width {
        height: 0;
        visibility: hidden;
    }
}

.kiwi-nicklist-users {
    flex: 1;
    width: 100%;
    padding: 4px 0;
    overflow: hidden scroll;
    scrollbar-width: thin;
    scrollbar-color: var(--comp-scroller-fg, #cdcdcd) var(--comp-scroller-bg, #f0f0f0);

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--comp-scroller-fg, #cdcdcd);
    }

    &::-webkit-scrollbar-track {
        background-color: var(--comp-scroller-bg, #f0f0f0);
    }
}
</style>
