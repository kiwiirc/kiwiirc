<template>
    <span
        v-if="checkCap()"
        :user="user"
        :class="{ 'kiwi-awaystatusindicator-away': isUserAway(),
                  'kiwi-awaystatusindicator-not-away': !isUserAway() }"
        class="kiwi-awaystatusindicator"
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
            let networkId = this.$state.getActiveNetwork().id;
            let userToCheck = this.$state.getUser(networkId, this.user.nick);
            return userToCheck.isUserAway();
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

</style>
