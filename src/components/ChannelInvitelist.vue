<template>
    <div class="kiwi-channelinvitelist">
        <form class="u-form kiwi-channelinvitelist" @submit.prevent="">
            <a class="u-link" @click="updateInvitelist">{{ $t('invites_refresh') }}</a>
             <table v-if="inviteList.length > 0" class="kiwi-channelinvitelist-table">
                <tr>
                    <th>{{ $t('invites_user') }}</th>
                    <th>{{ $t('invites_by') }}</th>
                    <th/>
                    <th/>
                </tr>
                <tr v-for="invite in inviteList" :key="invite.invited">
                    <td class="kiwi-channelinvitelist-table-mask">{{ invite.invited }}</td>
                    <td class="kiwi-channelinvitelist-table-invitedby">{{ invite.invited_by }}</td>
                    <td class="kiwi-channelinvitelist-table-invitedat">
                        {{ (new Date(invite.invited_at * 1000)).toDateString() }}
                    </td>
                    <td class="kiwi-channelinvitelist-table-actions">
                        <i class="fa fa-trash" aria-hidden="true"
                           @click="removeInvite(invite.invited)"/>
                    </td>
                </tr>
            </table>
            <div v-else-if="is_refreshing">
                {{ $t('invites_refreshing') }}
            </div>
            <div v-else class="kiwi-channelinvitelist-empty">
                {{ $t('invites_nobody') }}
            </div>
        </form>
    </div>
</template>
 <script>
 export default {
    props: ['buffer'],
    data: function data() {
        return {
            inviteList: [],
            is_refreshing: false,
        };
    },
    created: function created() {
        this.updateInvitelist();
    },
    methods: {
        updateInvitelist: function updateInvitelist() {
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
        removeInvite: function removeInvite(mask) {
            let channelName = this.buffer.name;
            this.buffer.getNetwork().ircClient.removeInvite(channelName, mask);
            this.inviteList = this.inviteList.filter(invite => invite.invited !== mask);
        },
    },
};
</script>
 <style lang="less">
.kiwi-channelinvitelist-table {
    width: 100%;
    border-collapse: collapse;
    line-height: 20px;
    margin-top: 10px;
}
 .kiwi-channelinvitelist-table-invitedat {
    min-width: 150px;
}
 .kiwi-channelinvitelist-table-actions {
    min-width: 50px;
    text-align: center;
    cursor: pointer;
    position: relative;
    transition: all 0.3s;
    z-index: 1;
}
</style>

