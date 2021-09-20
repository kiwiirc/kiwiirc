<template>
    <transition
        name="u-transition-expand"
        @enter="enter"
        @after-enter="afterEnter"
        @leave="leave"
    >
        <div v-if="$slots.default"><slot /></div>
    </transition>
</template>

<script>
'kiwi public';

const Vue = require('vue');

// Code created from https://markus.oberlehner.net/blog/transition-to-height-auto-with-vue/

export default Vue.component('transition-expand', {
    name: 'TransitionExpand',
    methods: {
        enter(element) {
            const width = getComputedStyle(element).width;

            element.style.width = width;
            element.style.position = 'absolute';
            element.style.visibility = 'hidden';
            element.style.height = 'auto';

            const height = getComputedStyle(element).height;

            element.style.width = null;
            element.style.position = null;
            element.style.visibility = null;
            element.style.height = 0;

            // Force repaint to make sure the
            // animation is triggered correctly.
            // eslint-disable-next-line no-unused-expressions
            getComputedStyle(element).height;

            // Trigger the animation.
            // We use `requestAnimationFrame` because we need
            // to make sure the browser has finished
            // painting after setting the `height`
            // to `0` in the line above.
            requestAnimationFrame(() => {
                element.style.height = height;
            });
        },
        afterEnter(element) {
            element.style.height = 'auto';
        },
        leave(element) {
            const height = getComputedStyle(element).height;

            element.style.height = height;

            // Force repaint to make sure the
            // animation is triggered correctly.
            // eslint-disable-next-line no-unused-expressions
            getComputedStyle(element).height;

            requestAnimationFrame(() => {
                element.style.height = 0;
            });
        },
    },
});
</script>

<style>
.u-transition-expand-enter-active,
.u-transition-expand-leave-active {
    transition: height 0.2s, opacity 0.2s;
    overflow: hidden;
}

.u-transition-expand-enter,
.u-transition-expand-leave-to {
    opacity: 0;
    height: 0;
}
</style>

<style scoped>
/*
    try to force the browser into optimizing the animation
    using hardware acceleration
*/
* {
    will-change: height;
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
}
</style>
