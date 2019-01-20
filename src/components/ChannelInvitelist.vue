<template>
    <div class="kiwi-invitelist">
        <form class="u-form kiwi-invitelist" @submit.prevent="">
            <a class="u-link" @click="updateInvitelist">{{ $t('invites_refresh') }}</a>

            <div v-if="!channelIsInviteOnly">
                This is a public channel.
                <a
                    v-if="areWeAnOp"
                    class="u-link"
                    @click="setInviteOnly"
                >Only allow invited users</a>
            </div>

            <span v-if="anyRegisteredUserCanJoin">Any registered user can join</span>

            <div v-if="supportsAccounts">
                <h3>Invited users ({{ inviteListAccounts.length }})</h3>
                <div v-if="knownAccounts.length > 0 && areWeAnOp">
                    <select ref="addInviteList">
                        <option
                            v-for="user in knownAccounts"
                            :key="user.nick" :value="user.account"
                        >{{ user.account }}</option>
                    </select>
                    <button @click="addAccountInvite($refs.addInviteList.value)">Add invite</button>
                </div>

                <table v-if="inviteListAccounts.length > 0" class="kiwi-invitelist-table">
                    <tr>
                        <th>{{ $t('invites_user') }}</th>
                        <th>{{ $t('invites_by') }}</th>
                        <th/>
                        <th/>
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
                                class="fa fa-trash"
                                aria-hidden="true"
                                @click="removeInvite(invite.invited)"
                            />
                        </td>
                    </tr>
                </table>
            </div>

            <div v-if="supportsAccounts && inviteListNonAccounts.length > 0">
                <h3>Invite matches</h3>
                <table class="kiwi-invitelist-table">
                    <tr>
                        <th>{{ $t('invites_user') }}</th>
                        <th>{{ $t('invites_by') }}</th>
                        <th/>
                        <th/>
                    </tr>
                    <tr v-for="invite in inviteListNonAccounts" :key="invite.invited">
                        <td class="kiwi-invitelist-table-mask">
                            {{ invite.invited }}
                        </td>
                        <td class="kiwi-invitelist-table-invitedby">
                            {{ invite.invited_by }}
                        </td>
                        <td class="kiwi-invitelist-table-invitedat">
                            {{ (new Date(invite.invited_at * 1000)).toDateString() }}
                        </td>
                        <td class="kiwi-invitelist-table-actions">
                            <i
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

import * as IrcdDiffs from '@/helpers/IrcdDiffs';

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
            let accounts = this.inviteList.filter(i => i.invited.indexOf(this.extban) === 0);
            accounts.sort((a, b) => {
                let aMask = a.invited.toUpperCase();
                let bMask = b.invited.toUpperCase();

                if (aMask < bMask) {
                    return -1;
                }
                if (aMask > bMask) {
                    return 1;
                }

                return 0;
            });

            return accounts;
        },
        inviteListNonAccounts() {
            // If the ircd doesn't support accounts extban type, consider every invex non-account
            if (!this.supportsAccounts) {
                return this.inviteList;
            }

            return this.inviteList.filter(i => i.invited.indexOf(this.extban) !== 0);
        },
        channelIsInviteOnly() {
            return typeof this.buffer.modes.i !== 'undefined';
        },
        anyRegisteredUserCanJoin() {
            if (!this.supportsAccounts) {
                return false;
            }

            let extban = this.extban;
            // Find any invite that only consists of the extban and nothing else. Eg. '~a:'
            return !!this.inviteListAccounts.find(invite => invite.invited === extban + ':');
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
                if (users.account && inviteAccountNames.indexOf(users.account) === -1) {
                    accountUsers.push(users);
                }
            });

            return accountUsers;
        },
    },
    created() {
        this.updateInvitelist();
    },
    methods: {
        displayMask(invite) {
            let display = invite.invited.replace(this.extban + ':', '');
            display = display || '(Any registered user)';
            return display;
        },
        updateInvitelist() {
            if (this.buffer.getNetwork().state !== 'connected' || this.is_refreshing) {
                return;
            }
            let channelName = this.buffer.name;
            this.is_refreshing = true;
            this.buffer.getNetwork().ircClient.inviteList(channelName, (inviteEvent) => {
                this.inviteList = inviteEvent.invites;
                this.is_refreshing = false;
            });
        },
        removeInvite(mask) {
            let channelName = this.buffer.name;
            this.buffer.getNetwork().ircClient.removeInvite(channelName, mask);
            this.inviteList = this.inviteList.filter(invite => invite.invited !== mask);
        },
        addAccountInvite(accountName) {
            let network = this.buffer.getNetwork();
            network.ircClient.addInvite(this.buffer.name, `${this.extban}:${accountName}`);
            this.updateInvitelist();
        },
        setInviteOnly() {
            this.buffer.getNetwork().ircClient.mode(this.buffer.name, '+i');
        },
    },
};
</script>
<style lang="less">
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
</style>
