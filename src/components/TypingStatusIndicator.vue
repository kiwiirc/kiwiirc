<template>
    <span
        v-if="user && user.typingState !== ''"
        :class="{ 'kiwi-typingstatusindicator--paused': user && user.typingState === 'paused' }"
        class="kiwi-typingstatusindicator"
    >…</span>
</template>

<script>
'kiwi public';

export default {
    props: ['user'],
};
</script>

<style>

</style>
