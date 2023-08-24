<template>
    <form class="u-form kiwi-channelbanlist" @submit.prevent="">
        <a class="u-link" @click="updateBanlist">{{ $t('bans_refresh') }}</a>

        <div
            v-if="banlist.length > 0"
            :class="{'kiwi-sidebar-settings-access-restricted': !areWeAnOp}"
            class="kiwi-sidebar-settings-access-table"
        >
            <div class="kiwi-sidebar-settings-access-table-header">{{ $t('bans_user') }}</div>
            <div class="kiwi-sidebar-settings-access-table-header">{{ $t('bans_by') }}</div>
            <div class="kiwi-sidebar-settings-access-table-header" />
            <div v-if="areWeAnOp" class="kiwi-sidebar-settings-access-table-header" />

            <template v-for="ban in banlist">
                <div
                    :key="'mask' + ban.banned"
                    class="kiwi-sidebar-settings-access-mask"
                >
                    {{ ban.banned }}
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
        <div v-else class="kiwi-channelbanlist-empty">
            {{ $t('bans_nobody') }}
        </div>
    </form>
</template>

<script>
'kiwi public';

export default {
    props: ['buffer'],
    data() {
        return {
            banlist: [],
            is_refreshing: false,
        };
    },
    computed: {
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
    },
    watch: {
        buffer() {
            this.banlist = [];
            this.is_refreshing = false;
            this.updateBanlist();
        },
    },
    created() {
        this.updateBanlist();
    },
    methods: {
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

                this.banlist = event.bans;
                this.is_refreshing = false;
            });
        },
        removeBan(mask) {
            const channelName = this.buffer.name;
            this.buffer.getNetwork().ircClient.unban(channelName, mask);
            this.banlist = this.banlist.filter((ban) => ban.banned !== mask);
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
</style>
