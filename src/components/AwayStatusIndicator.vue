<template>
    <span
        v-if="doesNetworkHaveAwayNotifyCap()"
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
    props: ['network', 'user'],
    computed: {
    },
    methods: {
        doesNetworkHaveAwayNotifyCap() {
            return this.network.ircClient.network.cap.isEnabled('away-notify');
        },
        isUserAway() {
            if (this.user.away) {
                return true;
            }
            return false;
        },
        toggleSelfAway() {
            if (this.isUserSelf()) {
                let val = this.isUserAway();
                this.network.ircClient.raw('AWAY', val ? '' : 'Currently away');
            }
        },
        isUserSelf() {
            if (this.user ===
                this.$state.getUser(this.network.id, this.network.nick)) {
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
    border-radius: 50%;
    margin: 0 4px 0 0;
    transition: background 0.2s;
}

.kiwi-awaystatusindicator-self {
    cursor: pointer;
}

</style>
