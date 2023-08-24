<template>
    <form class="u-form kiwi-invitelist" @submit.prevent="">
        <div v-if="!channelIsInviteOnly" class="kiwi-invitelist-status">
            {{ $t('invite_public_channel') }}
            <a
                v-if="areWeAnOp"
                class="u-link"
                @click="setInviteOnly"
            >{{ $t('invite_set_private') }}</a>
        </div>
        <div v-else class="kiwi-invitelist-status">
            {{ $t('invite_private_channel') }}
            <a
                v-if="areWeAnOp"
                class="u-link"
                @click="removeInviteOnly"
            >{{ $t('invite_set_public') }}</a>
        </div>

        <span v-if="anyRegisteredUserCanJoin">{{ $t('invite_registered_only') }}</span>

        <template v-if="areWeAnOp">
            <div class="kiwi-invitelist-invite u-form">
                <input
                    v-model="inviteMaskOrAccount"
                    type="text"
                    class="u-input"
                    @keydown="inviteKeyDown"
                >
                <a class="u-button u-button-secondary" @click="addInvite()">
                    {{ $t('invite_add_invite') }}
                </a>
            </div>
            <auto-complete
                v-if="supportsAccounts && knownAccounts.length > 0"
                ref="autocomplete"
                class="kiwi-invitelist-auto-complete"
                :items="knownAccounts"
                :filter="inviteMaskOrAccount"
                @selected="inviteSelected"
            />
        </template>

        <a
            class="u-link kiwi-invitelist-refresh"
            @click="updateInvitelist"
        >
            {{ $t('invites_refresh') }}
        </a>

        <div
            v-if="inviteList.length > 0"
            :class="{'kiwi-sidebar-settings-access-restricted': !areWeAnOp}"
            class="kiwi-sidebar-settings-access-table"
        >
            <div class="kiwi-sidebar-settings-access-table-header">{{ $t('invites_user') }}</div>
            <div class="kiwi-sidebar-settings-access-table-header">{{ $t('invites_by') }}</div>
            <div class="kiwi-sidebar-settings-access-table-header" />
            <div v-if="areWeAnOp" class="kiwi-sidebar-settings-access-table-header" />

            <template v-for="invite in inviteListAccounts.concat(inviteListNonAccounts)">
                <div
                    :key="'mask' + invite.invited"
                    class="kiwi-sidebar-settings-access-mask"
                >
                    {{ displayMask(invite) }}
                </div>
                <div
                    :key="'who' + invite.invited"
                    class="kiwi-sidebar-settings-access-who"
                >
                    {{ invite.invited_by }}
                </div>
                <div
                    :key="'when' + invite.invited"
                    class="kiwi-sidebar-settings-access-when"
                >
                    {{
                        (new Date(invite.invited_at * 1000)).toLocaleDateString({
                            year: "numeric", month: "2-digit", day: "2-digit"
                        })
                    }}
                </div>
                <div
                    v-if="areWeAnOp"
                    :key="'actions' + invite.invited"
                    class="kiwi-sidebar-settings-access-actions"
                >
                    <i
                        class="fa fa-trash"
                        aria-hidden="true"
                        @click="removeInvite(invite.invited)"
                    />
                </div>
            </template>
        </div>

        <div v-if="is_refreshing">
            {{ $t('invites_refreshing') }}
        </div>
    </form>
</template>
<script>

import _ from 'lodash';
import * as IrcdDiffs from '@/helpers/IrcdDiffs';
import * as Misc from '@/helpers/Misc';

import AutoComplete from './AutoComplete';

function inviteListSorter(a, b) {
    return Misc.strCompare(a.invited, b.invited);
}

export default {
    components: {
        AutoComplete,
    },
    props: ['buffer'],
    data() {
        return {
            inviteMaskOrAccount: '',
            inviteList: [],
            is_refreshing: false,
        };
    },
    computed: {
        supportsAccounts() {
            return !!this.extban;
        },
        extban() {
            return IrcdDiffs.extbanAccount(this.buffer.getNetwork());
        },
        inviteListAccounts() {
            if (!this.supportsAccounts) {
                return [];
            }

            return this.inviteList
                .filter((i) => i.invited.indexOf(this.extban) === 0)
                .sort(inviteListSorter);
        },
        inviteListNonAccounts() {
            // Only filter extban invites if the server supports them.
            const invites = (this.supportsAccounts)
                ? this.inviteList.filter((i) => i.invited.indexOf(this.extban) !== 0)
                : this.inviteList.slice();

            return invites.sort(inviteListSorter);
        },
        channelIsInviteOnly() {
            return typeof this.buffer.modes.i !== 'undefined';
        },
        anyRegisteredUserCanJoin() {
            if (!this.supportsAccounts) {
                return false;
            }

            if (!this.channelIsInviteOnly) {
                return false;
            }

            let extban = this.extban;
            // Find any invite that only consists of the extban and nothing else. Eg. '~a:'
            return !!this.inviteListAccounts.find((invite) => invite.invited === extban + ':');
        },
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
        knownAccounts() {
            // Get an array of every account name we're aware of on the network, excluding
            // the ones we already have in our invite list
            let users = this.buffer.getNetwork().users;
            let extban = this.extban;
            let inviteAccountNames = this.inviteListAccounts.map((i) => {
                let mask = i.invited;
                return mask.replace(extban + ':', '');
            });

            let accountUsers = [];
            Object.values(users).forEach((user) => {
                if (user.account && inviteAccountNames.indexOf(user.account) === -1) {
                    accountUsers.push(user);
                }
            });

            const mapper = (user) => {
                let text = user.account;
                if (user.account !== user.nick) {
                    text += ` (${user.nick})`;
                }
                return { text, user };
            };

            return _.orderBy(accountUsers, ['account', 'nick']).map(mapper);
        },
    },
    watch: {
        buffer() {
            this.banlist = [];
            this.is_refreshing = false;
            this.updateInvitelist();
        },
    },
    created() {
        this.updateInvitelist();
    },
    methods: {
        displayMask(invite) {
            let display = invite.invited.replace(this.extban + ':', '');
            display = display || this.$t('invite_any_registered');
            return display;
        },
        updateInvitelist() {
            if (this.is_refreshing || this.buffer.getNetwork().state !== 'connected') {
                return;
            }

            const channelName = this.buffer.name;
            const network = this.buffer.getNetwork();
            this.is_refreshing = true;

            this.buffer.getNetwork().ircClient.inviteList(channelName, (event) => {
                const currentNetwork = this.buffer.getNetwork();
                const bufferMatches = currentNetwork.ircClient
                    .caseCompare(this.buffer.name, event.channel);

                if (!bufferMatches || network !== currentNetwork) {
                    // The buffer or network changed since making the request
                    return;
                }

                this.inviteList = (event) ? event.invites : [];
                this.is_refreshing = false;
            });
        },
        addInvite() {
            const maskOrAccount = this.inviteMaskOrAccount.trim();
            if (!maskOrAccount) {
                return;
            }

            const ircClient = this.buffer.getNetwork().ircClient;
            const isMask = maskOrAccount.includes('@');

            if (this.supportsAccounts && !isMask) {
                ircClient.addInvite(this.buffer.name, `${this.extban}:${maskOrAccount}`);
            } else {
                ircClient.addInvite(this.buffer.name, maskOrAccount);
            }

            this.inviteMaskOrAccount = '';
            this.updateInvitelist();
        },
        removeInvite(mask) {
            const channelName = this.buffer.name;
            this.buffer.getNetwork().ircClient.removeInvite(channelName, mask);
            this.inviteList = this.inviteList.filter((invite) => invite.invited !== mask);
        },
        setInviteOnly() {
            this.buffer.getNetwork().ircClient.mode(this.buffer.name, '+i');
        },
        removeInviteOnly() {
            this.buffer.getNetwork().ircClient.mode(this.buffer.name, '-i');
        },
        inviteSelected(_value, item) {
            this.inviteMaskOrAccount = item.user.account;
        },
        inviteKeyDown(event) {
            if (!this.$refs.autocomplete) {
                return;
            }

            if (event.key === 'Tab') {
                this.$refs.autocomplete.selectCurrentItem();
                event.preventDefault();
                return;
            }
            this.$refs.autocomplete.handleOnKeyDown(event);
        },
    },
};
</script>
<style lang="less">
.kiwi-invitelist {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
    margin: 10px 0;
}

.kiwi-invitelist-status {
    font-weight: 600;

    > a {
        font-weight: initial;
    }
}

.kiwi-invitelist-auto-complete {
    position: relative;
    bottom: 0;

    .kiwi-autocomplete-item {
        cursor: pointer;
    }
}

.kiwi-invitelist-invite {
    display: flex;
    width: 100%;
    box-sizing: border-box;

    > input {
        flex-grow: 1;
        margin-right: 10px;
    }
}
</style>
