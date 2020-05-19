<template functional>
    <span
        v-if="props.user && $options.m.status(props) !== ''"
        :class="{
            'kiwi-typingstatusindicator--paused': $options.m.status(props) === 'paused',
            [data.staticClass]: true,
        }"
        class="kiwi-typingstatusindicator"
    >…</span>
</template>

<script>
'kiwi public';

const methods = {
    props: {},
    status(props) {
        // let props = this.props;
        if (!props.user || !props.buffer) {
            return '';
        }

        return props.user.typingStatus(props.buffer.name).status;
    },
};

export default {
    props: {
        user: Object,
        buffer: Object,
    },
    m: methods,
};
</script>
