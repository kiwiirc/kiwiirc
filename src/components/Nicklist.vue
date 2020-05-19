<template>
    <div
        :class="{
            'kiwi-nicklist--filtering': filter_visible,
            'kiwi-nicklist--avatars': shouldShowAvatars,
        }"
        class="kiwi-nicklist"
    >
        <div class="kiwi-nicklist-usercount" @click="toggleUserFilter">
            <span>
                {{
                    filter_visible ?
                        sortedUsers.length :
                        $t('person', {count: sortedUsers.length})
                }}
            </span>

            <input
                ref="user_filter"
                v-model="user_filter"
                :placeholder="$t('filter_users')"
                @blur="onFilterBlur"
            >
            <i class="fa fa-search" />
        </div>

        <DynamicScroller
            ref="scroller"
            :items="sortedUsers"
            :min-item-size="39"
            :key-field="'nick'"
            :emit-update="storeScrollIndex"
            class="kiwi-nicklist-users"
            @visible="onScrollerVisible"
            @update="debounceScrollerUpdate"
        >
            <template v-slot="{ item, index, active }">
                <DynamicScrollerItem
                    :item="item"
                    :active="active"
                    :size-dependencies="[]"
                    :data-index="index"
                >
                    <nicklist-user
                        :key="item.nick"
                        :user="item"
                        :nicklist="self"
                        :network="network"
                    />
                </DynamicScrollerItem>
            </template>
        </DynamicScroller>
    </div>
</template>

<script>

'kiwi public';

import _ from 'lodash';
import Logger from '@/libs/Logger';
import NicklistUser from './NicklistUser';

let log = Logger.namespace('Nicklist');

// This provides a better sort for numbered nicks but does not work on ios9
let intlCollator = null;
if (global.Intl) {
    intlCollator = new Intl.Collator({}, { numeric: true });
}

// Hot function, so it's here for easier caching
function strCompare(a, b) {
    if (intlCollator) {
        return intlCollator.compare(a, b);
    }

    if (a === b) {
        return 0;
    }

    return a > b ?
        1 :
        -1;
}

export default {
    components: {
        NicklistUser,
    },
    props: ['network', 'buffer', 'sidebarState'],
    data: function data() {
        return {
            userbox_user: null,
            user_filter: '',
            filter_visible: false,
            scroller_visible: false,
            debounceScrollerUpdate: null,
            self: this,
        };
    },
    computed: {
        shouldShowAvatars() {
            return this.buffer.setting('nicklist_avatars');
        },
        sortedUsers() {
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
                    // Compare away status
                    if (this.$state.setting('nicklistGroupAway')) {
                        if (a.away && !b.away) {
                            return 1;
                        }
                        if (!a.away && b.away) {
                            return -1;
                        }
                    }

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
                let aP = prefixOrders[this.buffer.userMode(a)];
                let bP = prefixOrders[this.buffer.userMode(b)];
                if (aP > bP) {
                    return 1;
                } else if (aP < bP) {
                    return -1;
                }

                // Prefixes are the same, compare away status
                if (this.$state.setting('nicklistGroupAway')) {
                    if (a.away && !b.away) {
                        return 1;
                    }
                    if (!a.away && b.away) {
                        return -1;
                    }
                }

                // Prefixes are the same, resort to comparing text
                return strCompare(nickMap[a.nick], nickMap[b.nick]);
            });
        },
        useColouredNicks() {
            return this.buffer.setting('coloured_nicklist');
        },
        storeScrollIndex() {
            return this.buffer.setting('store_nicklist_position');
        },
        scrollStartIndex() {
            return this.buffer.nicklist_index;
        },
    },
    created() {
        this.scroller_visible = false;
        this.debounceScrollerUpdate = _.debounce(this.onScrollerUpdate, 500);
    },
    methods: {
        userModePrefix(user) {
            return this.buffer.userModePrefix(user);
        },
        userMode(user) {
            return this.buffer.userMode(user);
        },
        openQuery(user) {
            let buffer = this.$state.addBuffer(this.buffer.networkid, user.nick);
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
            this.filter_visible = !this.filter_visible;
            if (this.filter_visible) {
                this.$nextTick(() => this.$refs.user_filter.focus());
            } else {
                this.user_filter = '';
            }
        },
        onFilterBlur() {
            if (!this.user_filter) {
                this.filter_visible = false;
            }
        },
        onScrollerVisible() {
            this.scroller_visible = true;

            if (!this.storeScrollIndex) {
                // this feature has been disabled
                return;
            }

            // scroller will error if we try to scroll to an item out of range
            let targetIndex = this.buffer.nicklist_index;
            if (targetIndex > this.$refs.scroller.items.length) {
                this.$refs.scroller.scrollToBottom();
            } else {
                this.$refs.scroller.scrollToItem(this.buffer.nicklist_index);
            }
        },
        onScrollerUpdate(startIndex, endIndex) {
            // update fires while the list is being populated so lets wait till its ready
            if (!this.scroller_visible || !this.$refs.scroller.items) {
                return;
            }

            let scroller = this.$el.querySelector('.kiwi-nicklist-users');
            let scrollerRect = scroller.getBoundingClientRect();
            let foundFirst = false;
            let AvatarsNeeded = [];

            // Although startIndex and endIndex is known these are not necessarily visible
            for (let i = startIndex; i < endIndex; i++) {
                let el = this.$el.querySelector(`.kiwi-nicklist-users div:not([style="transform: translateY(-9999px);"]) > div[data-index="${i}"]`);
                if (!el) {
                    continue;
                }
                let elRect = el.getBoundingClientRect();
                let inTop = elRect.top - scrollerRect.top + (elRect.height / 2) >= 0;
                let inBottom = elRect.bottom - scrollerRect.bottom - (elRect.height / 2) <= 0;
                if (inTop && inBottom) {
                    if (!foundFirst && inTop) {
                        if (this.storeScrollIndex) {
                            this.buffer.nicklist_index = i;
                        }
                        foundFirst = true;
                    }
                    let user = this.$refs.scroller.items[i];
                    if (user && user.avatar && !user.avatar.large) {
                        AvatarsNeeded.push(user);
                    }
                } else if (!inBottom && foundFirst) {
                    // Found the last in view element
                    break;
                }
            }
            this.$state.$emit('avatars.needed', { users: AvatarsNeeded });
        },
    },
};
</script>

<style lang="less">

/* Adjust the sidebars width when this nicklist is in view */
.kiwi-container .kiwi-sidebar.kiwi-sidebar-section-nicklist {
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
    display: flex;
    justify-content: space-between;
    cursor: default;
    box-sizing: border-box;
    height: 43px;
    line-height: 40px;
    width: 100%;
    border-bottom: 1px solid;
}

.kiwi-nicklist-usercount span {
    margin-left: 15px;
    font-weight: 600;
}

.kiwi-nicklist-usercount .fa-search {
    opacity: 0.3;
    cursor: pointer;
    font-size: 1.2em;
    line-height: 40px;
    align-self: flex-start;
    margin-right: 15px;
}

.kiwi-nicklist-usercount .fa-search:hover,
.kiwi-nicklist--filtering .kiwi-nicklist-usercount .fa-search {
    opacity: 1;
}

.kiwi-nicklist-usercount input {
    width: 0%;
    border: none;
    font-weight: normal;
    background: none;
    outline: 0;
    padding: 0 15px 0 10px;
    opacity: 0;
    box-sizing: border-box;
    flex-grow: 1;
    transition: all 0.2s;
}

.kiwi-nicklist--filtering .kiwi-nicklist-usercount input {
    opacity: 1;
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
    line-height: 1.2em;
    margin-top: 6px;
}

@media screen and (max-width: 759px) {
    .kiwi-container .kiwi-sidebar.kiwi-sidebar-section-nicklist {
        width: 100%;
        max-width: 380px;
    }
}

</style>
