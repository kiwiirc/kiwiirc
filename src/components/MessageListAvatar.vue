<template>
    <div
        :style="{
            'background-color': colour
        }"
        :data-nick="message.nick"
        class="kiwi-messagelist-avatar"
    >
        {{ message.nick[0] }}
    </div>
</template>

<script>

'kiwi public';

export default {
    props: ['message'],
    computed: {
        colour() {
            return this.message.user ?
                this.message.user.getColour() :
                '';
        },
    },
};

</script>

<style>

.kiwi-messagelist-avatar {
    text-transform: uppercase;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    text-align: center;
    line-height: 40px;
    font-weight: 600;
    margin-top: 3px;
    border: 2px solid;
}

</style>
