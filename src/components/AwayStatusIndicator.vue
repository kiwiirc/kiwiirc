<template>
    <span
        v-if="awayNotifySupported"
        :class="{ 'kiwi-awaystatusindicator--away': user.isAway(),
                  'kiwi-awaystatusindicator--self': isUserSelf }"
        class="kiwi-awaystatusindicator"
        @click="toggleSelfAway()"
    />
</template>

<script>
'kiwi public';

export default {
    props: ['network', 'user'],
    computed: {
        isUserSelf() {
            let user = this.$state.getUser(this.network.id, this.network.nick);
            return this.user === user;
        },
        awayNotifySupported() {
            return this.network.ircClient.network.cap.isEnabled('away-notify');
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
