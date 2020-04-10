<template>
    <span
        v-if="user && status !== ''"
        :class="{ 'kiwi-typingstatusindicator--paused': status === 'paused' }"
        class="kiwi-typingstatusindicator"
    >…</span>
</template>

<script>
'kiwi public';

export default {
    props: ['user', 'buffer'],
    computed: {
        status() {
            if (!this.user || !this.buffer) {
                return '';
            }

            return this.user.typingStatus(this.buffer.name).status;
        },
    },
};
</script>
