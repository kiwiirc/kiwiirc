<template>
    <span
        v-if="checkCap()"
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
    methods: {
        checkCap() {
            return this.doesNetworkHaveAwayNotifyCap;
        },
        isUserAway() {
            if (this.doesNetworkHaveAwayNotifyCap) {
                let nick = this.$state.getActiveNetwork().nick;
                let networkId = this.$state.getActiveNetwork().id;
                let user = this.$state.getUser(networkId, nick);
                return user.getUserStatus();
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
