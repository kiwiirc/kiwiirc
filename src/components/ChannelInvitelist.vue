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
                items-per-page="5"
                :items="knownAccounts"
                :filter="inviteMaskOrAccount"
                @selected="accountSelected"
            />
        </template>

        <a
            class="kiwi-invitelist-refresh"
            :class="{'u-link': !is_refreshing && !clickUpdateTimeout }"
            @click="clickUpdateInvitelist"
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

            <template v-for="invite in sortedInviteList">
                <div
                    :key="'mask' + invite.invited"
                    class="kiwi-sidebar-settings-access-mask"
                >
                    {{ displayMask(invite.invited) }}
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
                    :title="(new Date(invite.invited_at * 1000)).toLocaleString({
                        year: 'numeric', month: '2-digit', day: '2-digit'
                    })"
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
        <div v-else-if="is_refreshing">
            {{ $t('invites_refreshing') }}
        </div>
        <div v-else>
            {{ $t('invites_nobody') }}
        </div>
    </form>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as IrcdDiffs from '@/helpers/IrcdDiffs';
import * as Misc from '@/helpers/Misc';

import AutoComplete from './AutoComplete';

const getInviteListSorter = (extban) => {
    if (!extban) {
        return (a, b) => Misc.strCompare(a.invited, b.invited);
    }

    const extbanColon = extban + ':';
    return (a, b) => {
        const aAccount = a.invited.indexOf(extbanColon) === 0;
        const bAccount = b.invited.indexOf(extbanColon) === 0;

        if (aAccount && !bAccount) {
            return -1;
        } else if (!aAccount && bAccount) {
            return 1;
        }

        return Misc.strCompare(a.invited, b.invited);
    };
};

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
            clickUpdateTimeout: 0,
        };
    },
    computed: {
        supportsAccounts() {
            return !!this.extban;
        },
        extban() {
            return IrcdDiffs.extbanAccount(this.buffer.getNetwork());
        },
        channelIsInviteOnly() {
            return typeof this.buffer.modes.i !== 'undefined';
        },
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
        sortedInviteList() {
            const sorter = getInviteListSorter(this.extban);
            return this.inviteList.slice().sort(sorter);
        },
        inviteListAccounts() {
            const extbanColon = this.extban + ':';

            return (this.supportsAccounts)
                ? this.inviteList.filter((i) => i.invited.indexOf(extbanColon) === 0)
                : [];
        },
        anyRegisteredUserCanJoin() {
            if (!this.supportsAccounts) {
                return false;
            }

            if (!this.channelIsInviteOnly) {
                return false;
            }

            const extbanColon = this.extban + ':';

            // Find any invite that only consists of the extban and nothing else. Eg. '~a:'
            return this.inviteListAccounts.some((i) => i.invited === extbanColon);
        },
        knownAccounts() {
            // Get an array of every account name we're aware of on the network, excluding
            // the ones we already have in our invite list
            const extbanColon = this.extban + ':';
            const accountMapper = (invite) => invite.invited.replace(extbanColon, '');
            const existingInviteAccounts = this.inviteListAccounts.map(accountMapper);

            const users = this.buffer.getNetwork().users;
            const accountUsers = [];
            Object.values(users).forEach((user) => {
                if (user.account && !existingInviteAccounts.includes(user.account)) {
                    accountUsers.push(user);
                }
            });

            const autocompleteMapper = (user) => {
                let text = user.account;
                if (user.account !== user.nick) {
                    text += ` (${user.nick})`;
                }
                return { text, user };
            };

            return _.orderBy(accountUsers, ['account', 'nick']).map(autocompleteMapper);
        },
    },
    watch: {
        buffer() {
            this.inviteList = [];
            this.is_refreshing = false;
            this.clickUpdateTimeout = 0;
            this.updateInvitelist();
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
                if (change.mode.length !== 2 || change.mode[1] !== 'I') {
                    return;
                }

                if (change.mode[0] === '+') {
                    this.inviteList.push({
                        invited: change.param,
                        invited_at: Math.floor(event.time / 1000),
                        invited_by: event.nick,
                        channel: event.target,
                    });
                } else if (change.mode[0] === '-') {
                    this.inviteList = this.inviteList.filter(
                        (invite) => invite.invited !== change.param
                    );
                }
            });
        });

        this.updateInvitelist();
    },
    methods: {
        displayMask(inviteMask) {
            return inviteMask.replace(this.extban + ':', '')
                || this.$t('invite_any_registered');
        },
        clickUpdateInvitelist() {
            if (this.clickUpdateTimeout) {
                return;
            }

            this.clickUpdateTimeout = setTimeout(() => {
                this.clickUpdateTimeout = 0;
            }, 4000);

            this.updateInvitelist();
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
            const isMask = maskOrAccount.includes('@') || maskOrAccount.includes(':');

            if (this.supportsAccounts && !isMask) {
                ircClient.addInvite(this.buffer.name, `${this.extban}:${maskOrAccount}`);
            } else {
                ircClient.addInvite(this.buffer.name, maskOrAccount);
            }

            this.inviteMaskOrAccount = '';
        },
        removeInvite(mask) {
            const channelName = this.buffer.name;
            this.buffer.getNetwork().ircClient.removeInvite(channelName, mask);
        },
        setInviteOnly() {
            this.buffer.getNetwork().ircClient.mode(this.buffer.name, '+i');
        },
        removeInviteOnly() {
            this.buffer.getNetwork().ircClient.mode(this.buffer.name, '-i');
        },
        accountSelected(_value, item) {
            this.inviteMaskOrAccount = item.user.account;
        },
        inviteKeyDown(event) {
            if (!this.$refs.autocomplete) {
                return;
            }
            const autoComplete = this.$refs.autocomplete;

            if (event.key === 'Tab') {
                event.preventDefault();
                autoComplete.selectCurrentItem();
                return;
            }

            const selectedItem = autoComplete.selectedItem;
            if (event.key === 'Enter' && selectedItem.user.account === this.inviteMaskOrAccount) {
                event.preventDefault();
                this.addInvite();
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
        padding: 5px 11px;
    }
}

.kiwi-invitelist-refresh:not(.u-link) {
    cursor: default;
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
