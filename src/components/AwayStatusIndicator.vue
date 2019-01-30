<template>
    <span
        v-if="checkCap()"
        :user="user"
        :class="{ 'kiwi-awaystatusindicator-away': isUserAway(),
                  'kiwi-awaystatusindicator-not-away': !isUserAway() }"
    />
</template>

<script>
'kiwi public';

export default {
    computed: {
        doesNetworkHaveAwayNotifyCap() {
            return this.$state.getActiveNetwork().ircClient.network.cap.isEnabled('away-notify');
        },
    },
    props: ['user'],
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
    },
};

</script>

<style>

.kiwi-awaystatusindicator-not-away {
    display: inline-block;
    width: 7px;
    height: 7px;
    border: 1px solid #e1e1e1;
    border-radius: 50%;
    margin: 0 4px 0 0;
    background-color: green;
}

.kiwi-awaystatusindicator-away {
    display: inline-block;
    width: 7px;
    height: 7px;
    border: 1px solid #e1e1e1;
    border-radius: 50%;
    margin: 0 4px 0 0;
    background-color: red;
}

</style>
