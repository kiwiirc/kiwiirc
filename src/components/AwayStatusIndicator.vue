<template>
    <span
        v-if="awayNotifySupported && networkConnected"
        :class="{ 'kiwi-awaystatusindicator--away': user.isAway(),
                  'kiwi-awaystatusindicator--self': isUserSelf }"
        class="kiwi-awaystatusindicator"
        @click="toggleSelfAway()"
    />
</template>

<script>
'kiwi public';

export default {
    props: ['network', 'user', 'toggle'],
    computed: {
        isUserSelf() {
            if (this.toggle === false) {
                return false;
            }
            let user = this.$state.getUser(this.network.id, this.network.nick);
            return this.user === user;
        },
        awayNotifySupported() {
            // Checking network.state forces this computed property to be updated
            // when it connects
            return this.network.state === 'connected' &&
                this.network.ircClient.network.cap.isEnabled('away-notify');
        },
        networkConnected() {
            if (this.network.state === 'connected') {
                return true;
            }
            return false;
        },
    },
    methods: {
        toggleSelfAway() {
            if (this.isUserSelf) {
                let val = this.user.isAway();
                this.network.ircClient.raw('AWAY', val ? '' : 'Currently away');
            }
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

.kiwi-awaystatusindicator--self {
    cursor: pointer;
}

</style>
