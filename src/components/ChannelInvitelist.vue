<template>
    <div class="kiwi-invitelist">
        <form class="u-form kiwi-invitelist" @submit.prevent="">
            <a class="u-link" @click="updateInvitelist">{{ $t('invites_refresh') }}</a>

            <div v-if="!channelIsInviteOnly" class="kiwi-invitelist-inviteonly-status">
                {{ $t('invite_public_channel') }}
                <a
                    v-if="areWeAnOp"
                    class="u-link"
                    @click="setInviteOnly"
                >{{ $t('invite_set_private') }}</a>
            </div>
            <div v-else class="kiwi-invitelist-inviteonly-status">
                {{ $t('invite_private_channel') }}
                <a
                    v-if="areWeAnOp"
                    class="u-link"
                    @click="removeInviteOnly"
                >{{ $t('invite_set_public') }}</a>
            </div>

            <span v-if="anyRegisteredUserCanJoin">{{ $t('invite_registered_only') }}</span>

            <div>
                <div v-if="supportsAccounts && areWeAnOp">
                    <template v-if="knownAccounts.length > 0">
                        <select ref="addInviteList">
                            <option
                                v-for="user in knownAccounts"
                                :key="user.nick" :value="user.account"
                            >{{ user.account }}</option>
                        </select>
                        <button @click="addAccountInvite($refs.addInviteList.value)">
                            {{ $t('invite_add_invite') }}
                        </button>
                    </template>
                </div>
                <div v-if="!supportsAccounts && areWeAnOp" class="kiwi-invitelist-addmask">
                    <input ref="addInviteText" type="text" class="u-input">
                    <button @click="addInvite($refs.addInviteText.value)">
                        {{ $t('invite_add_invite') }}
                    </button>
                </div>

                <table v-if="inviteList.length > 0" class="kiwi-invitelist-table">
                    <tr>
                        <th>{{ $t('invites_user') }}</th>
                        <th>{{ $t('invites_by') }}</th>
                        <th />
                        <th />
                    </tr>
                    <tr v-for="invite in inviteListAccounts" :key="invite.invited">
                        <td class="kiwi-invitelist-table-mask">
                            {{ displayMask(invite) }}
                        </td>
                        <td class="kiwi-invitelist-table-invitedby">
                            {{ invite.invited_by }}
                        </td>
                        <td class="kiwi-invitelist-table-invitedat">
                            {{ (new Date(invite.invited_at * 1000)).toDateString() }}
                        </td>
                        <td class="kiwi-invitelist-table-actions">
                            <i
                                v-if="areWeAnOp"
                                class="fa fa-trash"
                                aria-hidden="true"
                                @click="removeInvite(invite.invited)"
                            />
                        </td>
                    </tr>
                    <tr v-for="invite in inviteListNonAccounts" :key="invite.invited">
                        <td class="kiwi-invitelist-table-mask">
                            {{ displayMask(invite) }}
                        </td>
                        <td class="kiwi-invitelist-table-invitedby">
                            {{ invite.invited_by }}
                        </td>
                        <td class="kiwi-invitelist-table-invitedat">
                            {{ (new Date(invite.invited_at * 1000)).toDateString() }}
                        </td>
                        <td class="kiwi-invitelist-table-actions">
                            <i
                                v-if="areWeAnOp"
                                class="fa fa-trash"
                                aria-hidden="true"
                                @click="removeInvite(invite.invited)"
                            />
                        </td>
                    </tr>
                </table>
            </div>

            <div v-if="is_refreshing">
                {{ $t('invites_refreshing') }}
            </div>
        </form>
    </div>
</template>
<script>

import _ from 'lodash';
import * as IrcdDiffs from '@/helpers/IrcdDiffs';

function inviteListSorter(a, b) {
    let aMask = a.invited.toUpperCase();
    let bMask = b.invited.toUpperCase();

    if (aMask < bMask) {
        return -1;
    }
    if (aMask > bMask) {
        return 1;
    }

    return 0;
}

export default {
    props: ['buffer'],
    data() {
        return {
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
            let accounts = this.inviteList.filter((i) => i.invited.indexOf(this.extban) === 0);
            accounts.sort(inviteListSorter);
            return accounts;
        },
        inviteListNonAccounts() {
            let invites = [];

            // If the ircd doesn't support accounts extban type, consider every invex non-account
            if (!this.supportsAccounts) {
                invites = this.inviteList;
            } else {
                invites = this.inviteList.filter((i) => i.invited.indexOf(this.extban) !== 0);
            }

            invites.sort(inviteListSorter);
            return invites;
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

            return _.orderBy(accountUsers, ['account', 'nick']);
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
            if (this.buffer.getNetwork().state !== 'connected' || this.is_refreshing) {
                return;
            }
            let channelName = this.buffer.name;
            this.is_refreshing = true;
            this.buffer.getNetwork().ircClient.inviteList(channelName, (inviteEvent) => {
                if (inviteEvent) {
                    this.inviteList = inviteEvent.invites;
                } else {
                    this.inviteList = [];
                }

                this.is_refreshing = false;
            });
        },
        removeInvite(mask) {
            let channelName = this.buffer.name;
            this.buffer.getNetwork().ircClient.removeInvite(channelName, mask);
            this.inviteList = this.inviteList.filter((invite) => invite.invited !== mask);
        },
        addAccountInvite(accountName) {
            if (!accountName) {
                return;
            }

            let network = this.buffer.getNetwork();
            network.ircClient.addInvite(this.buffer.name, `${this.extban}:${accountName}`);
            this.updateInvitelist();
        },
        addInvite(mask) {
            let network = this.buffer.getNetwork();
            network.ircClient.addInvite(this.buffer.name, mask);
            this.updateInvitelist();
        },
        setInviteOnly() {
            this.buffer.getNetwork().ircClient.mode(this.buffer.name, '+i');
        },
        removeInviteOnly() {
            this.buffer.getNetwork().ircClient.mode(this.buffer.name, '-i');
        },
    },
};
</script>
<style lang="less">
.kiwi-invitelist-inviteonly-status {
    margin-top: 10px;
}

.kiwi-invitelist-table {
    width: 100%;
    border-collapse: collapse;
    line-height: 20px;
    margin-top: 10px;
}

.kiwi-invitelist-table-invitedat {
    min-width: 150px;
}

.kiwi-invitelist-table-actions {
    min-width: 50px;
    text-align: center;
    cursor: pointer;
    position: relative;
    transition: all 0.3s;
    z-index: 1;
}

.kiwi-invitelist-addmask {
    display: flex;
}

.kiwi-invitelist-addmask > button {
    flex-shrink: 0;
}
</style>
