<template>
    <iframe src="../node_modules/kiwiirc/dist/" ref="kiwi" @load="pushConfig" class="kiwiObj"></iframe>
</template>

<script>
export default {
    props: ['kiwiConfig'],
    methods: {
        pushConfig() {
            this.$refs.kiwi.contentWindow.kiwiConfig = () => this.kiwiConfig
        }
    }
}
</script>

<style scoped>
.kiwiObj{
    width: 100%;
    height: 100%;
}
</style>
