<template functional>
    <div
        v-rawElement="{
            el: props.pluginElement,
            props: {
                kiwi: {
                    ...props.pluginProps,
                },
            },
        }"
        :class="{ [data.staticClass]: data.staticClass }"
    />
</template>

<script>

'kiwi public';

export default {
    props: {
        pluginElement: Element,
        pluginProps: Object,
    },
};

</script>
