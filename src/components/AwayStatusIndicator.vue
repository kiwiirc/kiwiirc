<template functional>
    <span
        v-if="$options.m.shouldShowStatus(props)"
        :class="{
            'kiwi-awaystatusindicator--offline': !props.user || props.user.isOffline(),
            'kiwi-awaystatusindicator--away': props.user && props.user.isAway(),
            'kiwi-awaystatusindicator--self': $options.m.isUserSelf(props),
            [data.staticClass]: !!data.staticClass,
        }"
        class="kiwi-awaystatusindicator"
        @click="$options.m.toggleSelfAway(props)"
    />
</template>

<script>
'kiwi public';

import getState from '@/libs/state';

const methods = {
    props: {},
    toggleSelfAway(props) {
        // let props = this.props;
        if (props.isUserSelf) {
            let val = props.user.isAway();
            props.network.ircClient.raw('AWAY', val ? '' : 'Currently away');
        }
    },
    isUserSelf(props) {
        // let props = this.props;
        if (props.toggle === false) {
            return false;
        }
        let user = getState().getUser(props.network.id, props.network.nick);
        return props.user === user;
    },
    shouldShowStatus(props) {
        // let props = this.props;
        if (!getState().setting('showAwayStatusIndicators')) {
            return false;
        }

        if (props.network.state !== 'connected') {
            return false;
        }

        let awayNotifyEnabled = props.network.ircClient.network.cap.isEnabled('away-notify');
        return getState().setting('buffers.who_loop') || awayNotifyEnabled;
    },
};

export default {
    props: {
        network: Object,
        user: Object,
        toggle: Boolean,
    },
    m: methods,
};
</script>

<style>

.kiwi-awaystatusindicator {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin: 0 4px 0 0;
    transition: background-color 0.5s;
}

.kiwi-awaystatusindicator--self {
    cursor: pointer;
}

</style>
