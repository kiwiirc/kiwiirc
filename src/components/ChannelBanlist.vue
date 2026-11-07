<template>
    <form class="u-form kiwi-channelbanlist" @submit.prevent="">
        <div v-if="areWeAnOp" class="kiwi-banlist-ban u-form">
            <input
                v-model="banMask"
                type="text"
                class="u-input"
                placeholder="*!*@*"
                @keydown="banKeyDown"
            >
            <a class="u-button u-button-secondary" @click="addBan()">
                {{ $t('bans_add_ban') }}
            </a>
        </div>

        <a
            class="kiwi-banlist-refresh"
            :class="{ 'u-link': !is_refreshing && !clickUpdateTimeout }"
            @click="clickUpdateBanlist"
        >
            {{ $t('bans_refresh') }}
        </a>

        <div v-if="banList.length > 0" class="kiwi-banlist-filter">
            <div class="kiwi-banlist-count">
                {{ $t('bans_count', { count: sortedBanList.length }) }}
            </div>
            <div class="kiwi-banlist-filter-input">
                <input
                    v-model="banFilter"
                    type="text"
                    class="u-input"
                    :placeholder="$t('filter_bans')"
                    autocomplete="off"
                    spellcheck="false"
                >
            </div>
        </div>

        <div
            v-if="banList.length > 0"
            :class="{ 'kiwi-sidebar-settings-access-restricted': !areWeAnOp }"
            class="kiwi-sidebar-settings-access-table"
        >
            <div class="kiwi-sidebar-settings-access-table-header">
                <button
                    type="button"
                    class="kiwi-banlist-sort"
                    :aria-sort="ariaSort('user')"
                    @click="setSort('user')"
                >
                    {{ $t('bans_user') }}
                    <i
                        v-if="sortKey === 'user'"
                        :class="sortDir === 'asc' ? 'fa fa-caret-up' : 'fa fa-caret-down'"
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div class="kiwi-sidebar-settings-access-table-header">
                <button
                    type="button"
                    class="kiwi-banlist-sort"
                    :aria-sort="ariaSort('by')"
                    @click="setSort('by')"
                >
                    {{ $t('bans_by') }}
                    <i
                        v-if="sortKey === 'by'"
                        :class="sortDir === 'asc' ? 'fa fa-caret-up' : 'fa fa-caret-down'"
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div class="kiwi-sidebar-settings-access-table-header">
                <button
                    type="button"
                    class="kiwi-banlist-sort"
                    :aria-sort="ariaSort('date')"
                    @click="setSort('date')"
                >
                    {{ $t('bans_date') }}
                    <i
                        v-if="sortKey === 'date'"
                        :class="sortDir === 'asc' ? 'fa fa-caret-up' : 'fa fa-caret-down'"
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div v-if="areWeAnOp" class="kiwi-sidebar-settings-access-table-header" />

            <template v-for="ban in sortedBanList">
                <div
                    :key="`mask${ban.banned}`"
                    class="kiwi-sidebar-settings-access-mask"
                >
                    {{ displayMask(ban.banned) }}
                </div>
                <div
                    :key="`who${ban.banned}`"
                    class="kiwi-sidebar-settings-access-who"
                >
                    {{ ban.banned_by }}
                </div>
                <div
                    :key="`when${ban.banned}`"
                    class="kiwi-sidebar-settings-access-when"
                    :title="(new Date(ban.banned_at * 1000)).toLocaleString({
                        year: 'numeric', month: '2-digit', day: '2-digit',
                    })"
                >
                    {{
                        (new Date(ban.banned_at * 1000)).toLocaleDateString({
                            year: "numeric", month: "2-digit", day: "2-digit",
                        })
                    }}
                </div>
                <div
                    v-if="areWeAnOp"
                    :key="`actions${ban.banned}`"
                    class="kiwi-sidebar-settings-access-actions"
                >
                    <i class="fa fa-trash" aria-hidden="true" @click="removeBan(ban.banned)" />
                </div>
            </template>
        </div>
        <div v-else-if="is_refreshing">
            {{ $t('bans_refreshing') }}
        </div>
        <div v-else>
            {{ $t('bans_nobody') }}
        </div>
    </form>
</template>

<script>
'kiwi public';

import * as IrcdDiffs from '@/helpers/IrcdDiffs';
import * as Misc from '@/helpers/Misc';

export default {
    props: ['buffer'],
    data() {
        return {
            banMask: '',
            banList: [],
            is_refreshing: false,
            clickUpdateTimeout: 0,
            banFilter: '',
            sortKey: 'date',
            sortDir: 'desc',
        };
    },
    computed: {
        extban() {
            return IrcdDiffs.extbanAccount(this.buffer.getNetwork());
        },
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
        filteredBanList() {
            const nickFilter = this.banFilter;
            if (!nickFilter) {
                return this.banList;
            }

            return this.banList.filter((ban) => {
                const displayed = this.displayMask(ban.banned || '');
                return displayed.indexOf(nickFilter) !== -1;
            });
        },
        sortedBanList() {
            const direction = this.sortDir === 'asc' ? 1 : -1;
            const key = this.sortKey;

            return this.filteredBanList.slice().sort((a, b) => {
                let result = 0;

                if (key === 'date') {
                    result = (a.banned_at || 0) - (b.banned_at || 0);
                } else if (key === 'by') {
                    result = Misc.strCompare(a.banned_by || '', b.banned_by || '');
                } else {
                    result = Misc.strCompare(
                        this.displayMask(a.banned || ''),
                        this.displayMask(b.banned || ''),
                    );
                }

                if (result === 0) {
                    result = Misc.strCompare(a.banned || '', b.banned || '');
                }

                return result * direction;
            });
        },
    },
    watch: {
        buffer() {
            this.banList = [];
            this.is_refreshing = false;
            this.clickUpdateTimeout = 0;
            this.banFilter = '';
            this.sortKey = 'date';
            this.sortDir = 'desc';
            this.updateBanlist();
        },
    },
    created() {
        this.listen(this.$state, 'irc.mode', (event, network) => {
            if (network !== this.buffer.getNetwork()) {
                return;
            }
            if (!network.ircClient.caseCompare(event.target, this.buffer.name)) {
                return;
            }

            event.modes.forEach((change) => {
                if (change.mode.length !== 2 || change.mode[1] !== 'b') {
                    return;
                }

                if (change.mode[0] === '+') {
                    this.banList.push({
                        banned: change.param,
                        banned_at: Math.floor(event.time / 1000),
                        banned_by: event.nick,
                        channel: event.target,
                    });
                } else if (change.mode[0] === '-') {
                    this.banList = this.banList.filter((ban) => ban.banned !== change.param);
                }
            });
        });

        this.updateBanlist();
    },
    methods: {
        displayMask(banMask) {
            return banMask.replace(this.extban + ':', '');
        },
        ariaSort(key) {
            if (this.sortKey !== key) {
                return 'none';
            }
            return this.sortDir === 'asc' ? 'ascending' : 'descending';
        },
        setSort(key) {
            if (this.sortKey === key) {
                this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
                return;
            }

            this.sortKey = key;
            this.sortDir = key === 'date' ? 'desc' : 'asc';
        },
        clickUpdateBanlist() {
            if (this.clickUpdateTimeout) {
                return;
            }

            this.clickUpdateTimeout = setTimeout(() => {
                this.clickUpdateTimeout = 0;
            }, 4000);

            this.updateBanlist();
        },
        updateBanlist() {
            if (this.is_refreshing || this.buffer.getNetwork().state !== 'connected') {
                return;
            }

            const channelName = this.buffer.name;
            const network = this.buffer.getNetwork();
            this.is_refreshing = true;

            network.ircClient.banlist(channelName, (event) => {
                const currentNetwork = this.buffer.getNetwork();
                const bufferMatches = currentNetwork.ircClient
                    .caseCompare(this.buffer.name, event.channel);

                if (!bufferMatches || network !== currentNetwork) {
                    // The buffer or network changed since making the request
                    return;
                }

                this.banList = event.bans;
                this.is_refreshing = false;
            });
        },
        addBan() {
            const mask = this.banMask.trim();
            if (!mask) {
                return;
            }
            const ircClient = this.buffer.getNetwork().ircClient;
            ircClient.ban(this.buffer.name, mask);

            this.banMask = '';
        },
        removeBan(mask) {
            const channelName = this.buffer.name;
            this.buffer.getNetwork().ircClient.unban(channelName, mask);
        },
        banKeyDown(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.addBan();
            }
        },
    },
};
</script>

<style lang="less">
.kiwi-channelbanlist {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    margin: 10px 0;
}

.kiwi-banlist-refresh:not(.u-link) {
    cursor: default;
}

.kiwi-banlist-ban {
    display: flex;
    width: 100%;
    box-sizing: border-box;

    > input {
        flex-grow: 1;
        margin-right: 10px;
    }
}

.kiwi-banlist-filter {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.kiwi-banlist-count {
    flex-shrink: 0;
    font-weight: 600;
    white-space: nowrap;
}

.kiwi-banlist-filter-input {
    flex: 1;
    min-width: 0;

    > input {
        box-sizing: border-box;
        width: 100%;
    }
}

.kiwi-banlist-sort {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    margin: 0;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: inherit;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    white-space: nowrap;

    > .fa {
        font-size: 0.85em;
    }

    &:hover {
        text-decoration: underline;
    }
}
</style>
