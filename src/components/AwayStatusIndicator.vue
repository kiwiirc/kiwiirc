<template>
    <span
        v-if="checkCap()"
        :user="user"
        :class="{ 'kiwi-awaystatusindicator-away': isUserAway(),
                  'kiwi-awaystatusindicator-not-away': !isUserAway(),
                  'kiwi-awaystatusindicator-self': isUserSelf() }"
        class="kiwi-awaystatusindicator"
        @click="toggleSelfAway()"
    />
</template>

<script>
'kiwi public';

export default {
    props: ['user'],
    computed: {
        doesNetworkHaveAwayNotifyCap() {
            return this.$state.getActiveNetwork().ircClient.network.cap.isEnabled('away-notify');
        },
    },
    methods: {
        checkCap() {
            return this.doesNetworkHaveAwayNotifyCap;
        },
        isUserAway() {
            if (this.doesNetworkHaveAwayNotifyCap) {
                let networkId = this.$state.getActiveNetwork().id;
                let userToCheck = this.$state.getUser(networkId, this.user.nick);
                return userToCheck.isUserAway();
            }
            return '';
        },
        toggleSelfAway() {
            let activeNetwork = this.$state.getActiveNetwork();
            if (this.isUserSelf()) {
                let val = this.isUserAway();
                activeNetwork.ircClient.raw('AWAY', val ? '' : 'Currently away');
            }
        },
        isUserSelf() {
            let activeNetwork = this.$state.getActiveNetwork();
            if (this.user === this.$state.getUser(activeNetwork.id, activeNetwork.nick)) {
                return true;
            }
            return false;
        },
    },
};
</script>

<style>

.kiwi-awaystatusindicator {
    display: inline-block;
    width: 7px;
    height: 7px;
    border: 1px solid #e1e1e1;
    border-radius: 50%;
    margin: 0 4px 0 0;
}

.kiwi-awaystatusindicator-not-away {
    background-color: green;
}

.kiwi-awaystatusindicator-away {
    background-color: red;
}

.kiwi-awaystatusindicator-self {
    cursor: pointer;
}

</style>
