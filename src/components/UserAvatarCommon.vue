<template>
    <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        style="position: fixed; width: 0; height: 0;"
    >
        <clipPath id="kiwi-avatar-clip">
            <circle r="50" cx="50" cy="50" />
        </clipPath>
        <mask id="kiwi-avatar-mask">
            <rect width="100" height="100" fill="#fff" />
            <circle r="14" cx="50" cy="0" :transform="awayStatusTransform" />
        </mask>
    </svg>
</template>

<script>
'kiwi public';

import getState from '@/libs/state';

const avatarPositions = [45, 135, 225, 315];
export function getAvatarTransform() {
    const position = getState().setting('avatars.away_status_position');
    const angle = avatarPositions[position - 1] || 45;
    return `rotate(${angle} 50 50)`;
}

export default {
    computed: {
        awayStatusTransform: getAvatarTransform,
    },
};
</script>
