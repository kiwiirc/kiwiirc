<template>
    <div class="kiwi-avatar">
        <svg v-if="user" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g
                v-bind="awayStatus.vbind"
                clip-path="url(#kiwi-avatar-clip)"
            >
                <rect
                    v-if="avatar.showBackground"
                    width="100"
                    height="100"
                    class="kiwi-avatar-background"
                    :style="{ fill: user.getColour() }"
                />
                <image
                    v-if="avatar.hasImage"
                    v-bind="{ ...avatar[avatar.sizeKey[size]].vbind }"
                    width="100"
                    height="100"
                    preserveAspectRatio="xMidYMid slice"
                    loading="lazy"
                    class="kiwi-avatar-image"
                    @error="avatar[avatar.sizeKey[size]].setFailed()"
                />
                <text
                    v-else
                    :font-size="avatar.initials.length === 1 ? '64px' : '44px'"
                    v-bind="awayStatus.vbind"
                    clip-path="url(#kiwi-avatar-clip)"
                    x="50"
                    y="50"
                    dy="0.36em"
                    text-anchor="middle"
                    class="kiwi-avatar-initials"
                >{{ avatar.initials }}</text>
            </g>
            <circle
                v-if="awayStatus.show"
                transform="rotate(45 50 50)"
                r="12"
                cx="50"
                cy="0"
                class="kiwi-avatar-status"
                :class="{
                    'kiwi-avatar-status--toggle': allowToggle,
                    'kiwi-avatar-status--away': user.isAway(),
                    'kiwi-avatar-status--offline': user.isOffline(),
                }"
                @click.stop="toggleAway"
            >
                <title v-if="allowToggle">{{ $t('toggle_away') }}</title>
            </circle>
        </svg>
        <svg v-else viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle r="50" cx="50" cy="50" class="kiwi-avatar-background" />
            <text
                font-size="64px"
                clip-path="url(#kiwi-avatar-clip)"
                x="50"
                y="50"
                dy="0.36em"
                text-anchor="middle"
                class="kiwi-avatar-initials"
            >{{ 'U' }}</text>
        </svg>
    </div>
</template>

<script>
'kiwi public';

import { computed } from 'vue';

import getState from '@/libs/state';

</script>

<script setup>
const props = defineProps({
    user: {
        type: Object,
        default: null,
    },
    message: {
        type: Object,
        default: null,
    },
    network: {
        type: Object,
        default: null,
    },
    size: {
        type: String,
        default: 'small',
    },
    forceShowStatus: {
        type: Boolean,
        default: false,
    },
    allowToggle: {
        type: Boolean,
        default: false,
    },
});

const getSizeObj = (size) => ({
    url: props.user.avatar[size],
    vbind: {
        'href': props.user.avatar[size],
        'xlink:href': props.user.avatar[size],
    },
    setFailed: () => {
        const avatar = props.user.avatar;
        const failedAvatar = avatar[size];
        avatar[size] = '';
        if (!avatar.small && !avatar.large) {
            getState().$emit('user.avatar.failed', {
                user: props.user,
                network: props.network,
                failed: failedAvatar,
            });
        }
    },
});

const shouldShowStatus = () => {
    if (props.network && props.forceShowStatus) {
        return true;
    }

    if (!props.network || props.network.state !== 'connected') {
        return false;
    }

    if (!getState().setting('showAwayStatusIndicators')) {
        return false;
    }

    const awayNotifyEnabled = props.network.ircClient.network.cap.isEnabled('away-notify');
    return getState().setting('buffers.who_loop') || awayNotifyEnabled;
};

const awayStatus = computed(() => {
    const show = shouldShowStatus();
    const vbind = {};

    if (show) {
        vbind.mask = 'url(#kiwi-avatar-mask)';
    }

    return {
        show,
        vbind,
    };
});

const avatar = computed(() => {
    let initialsLength = getState().setting('avatars.initials_length');
    if (!initialsLength || initialsLength < 1) {
        initialsLength = 1;
    }
    if (initialsLength > 2) {
        initialsLength = 2;
    }

    const nick = props.message?.nick || props.user.nick;
    const initials = nick.substring(0, initialsLength).toUpperCase();
    const hasImage = !!(props.user.avatar.small || props.user.avatar.large);

    const showBackground = !hasImage || getState().setting('avatars.show_image_background');
    const avatars = {
        hasImage,
        initials,
        showBackground,
        sizeKey: {},
    };

    if (props.user.avatar.small) {
        avatars.small = getSizeObj('small');
        avatars.sizeKey.small = 'small';
        if (!props.user.avatar.large) {
            avatars.sizeKey.large = 'small';
        }
    }

    if (props.user.avatar.large) {
        avatars.large = getSizeObj('large');
        avatars.sizeKey.large = 'large';
        if (!props.user.avatar.small) {
            avatars.sizeKey.small = 'large';
        }
    }

    return avatars;
});

const toggleAway = () => {
    if (!props.allowToggle || props.user.away === 'offline') {
        return;
    }
    const isAway = props.user.isAway();
    props.network.ircClient.raw('AWAY', isAway ? '' : 'Currently away');
};
</script>

<style lang="less">
@font-face {
    font-family: Roboto;
    src: url('../res/fonts/Roboto-Black.woff2') format('woff2'),
         url('../res/fonts/Roboto-Black.woff') format('woff')
         url('../res/fonts/Roboto-Black.ttf') format('truetype');
    font-weight: 900;
    font-style: normal;
    font-display: auto;
}

.kiwi-avatar {
    user-select: none;
}

.kiwi-avatar-status {
    transition: fill 0.5s ease;
}

.kiwi-avatar-status--toggle {
    cursor: pointer;
}

.kiwi-avatar-initials {
    font-family: 'Roboto', Arial, sans-serif;
    font-weight: 900;
}
</style>
