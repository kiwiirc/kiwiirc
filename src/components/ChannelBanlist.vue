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
            :class="{'u-link': !is_refreshing && !clickUpdateTimeout }"
            @click="clickUpdateBanlist"
        >
            {{ $t('bans_refresh') }}
        </a>

        <div
            v-if="banList.length > 0"
            :class="{'kiwi-sidebar-settings-access-restricted': !areWeAnOp}"
            class="kiwi-sidebar-settings-access-table"
        >
            <div class="kiwi-sidebar-settings-access-table-header">{{ $t('bans_user') }}</div>
            <div class="kiwi-sidebar-settings-access-table-header">{{ $t('bans_by') }}</div>
            <div class="kiwi-sidebar-settings-access-table-header" />
            <div v-if="areWeAnOp" class="kiwi-sidebar-settings-access-table-header" />

            <template v-for="ban in sortedBanList">
                <div
                    :key="'mask' + ban.banned"
                    class="kiwi-sidebar-settings-access-mask"
                >
                    {{ displayMask(ban.banned) }}
                </div>
                <div
                    :key="'who' + ban.banned"
                    class="kiwi-sidebar-settings-access-who"
                >
                    {{ ban.banned_by }}
                </div>
                <div
                    :key="'when' + ban.banned"
                    class="kiwi-sidebar-settings-access-when"
                    :title="(new Date(ban.banned_at * 1000)).toLocaleString({
                        year: 'numeric', month: '2-digit', day: '2-digit'
                    })"
                >
                    {{
                        (new Date(ban.banned_at * 1000)).toLocaleDateString({
                            year: "numeric", month: "2-digit", day: "2-digit"
                        })
                    }}
                </div>
                <div
                    v-if="areWeAnOp"
                    :key="'actions' + ban.banned"
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

const basicBanListSorter = (a, b) => {
    if (a.banned_at === b.banned_at) {
        return Misc.strCompare(a.banned, b.banned);
    }

    return b.banned_at - a.banned_at;
};
const getBanListSorter = (extban) => {
    if (!extban) {
        return basicBanListSorter;
    }

    const extbanColon = extban + ':';
    return (a, b) => {
        const aAccount = a.banned.indexOf(extbanColon) === 0;
        const bAccount = b.banned.indexOf(extbanColon) === 0;

        if (aAccount && !bAccount) {
            return -1;
        }

        if (!aAccount && bAccount) {
            return 1;
        }

        return basicBanListSorter(a, b);
    };
};

export default {
    props: ['buffer'],
    data() {
        return {
            banMask: '',
            banList: [],
            is_refreshing: false,
            clickUpdateTimeout: 0,
        };
    },
    computed: {
        extban() {
            return IrcdDiffs.extbanAccount(this.buffer.getNetwork());
        },
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
        sortedBanList() {
            const sorter = getBanListSorter(this.extban);
            return this.banList.slice().sort(sorter);
        },
    },
    watch: {
        buffer() {
            this.banList = [];
            this.is_refreshing = false;
            this.clickUpdateTimeout = 0;
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
</style>
