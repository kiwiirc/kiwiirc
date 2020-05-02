<template functional>
    <span
        v-if="$options.m.shouldShowStatus(props)"
        :class="{
            'kiwi-awaystatusindicator--away': props.user && props.user.isAway(),
            'kiwi-awaystatusindicator--self': $options.m.isUserSelf(props),
            [data.staticClass]: true,
        }"
        class="kiwi-awaystatusindicator"
        @click="$options.m.toggleSelfAway(props)"
    />
</template>

<script>
'kiwi public';

import state from '@/libs/state';

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
        let user = state.getUser(props.network.id, props.network.nick);
        return props.user === user;
    },
    shouldShowStatus(props) {
        // let props = this.props;
        if (!state.setting('showAwayStatusIndicators')) {
            return false;
        }

        if (props.network.state !== 'connected') {
            return false;
        }

        let awayNotifyEnabled = props.network.ircClient.network.cap.isEnabled('away-notify');
        return state.setting('buffers.who_loop') || awayNotifyEnabled;
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
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin: 0 4px 0 0;
    border: 1px solid #fff;
    transition: background 0.2s;
}

.kiwi-awaystatusindicator--self {
    cursor: pointer;
}

</style>
