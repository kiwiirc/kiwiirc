<template>
    <div class="kiwi-salert-content">
        <h1>New Conversation</h1>
        <multiselect v-model="value" :multiple="true" :options="options" />
        <p><small>*Selecting multiple users will create a new private channel.</small></p>
    </div>
</template>

<script>
'kiwi public';

import Multiselect from 'vue-multiselect';

export default {
    components: {
        Multiselect,
    },
    data: function data() {
        return {
            value: [],
            options: ['username1', 'username2', 'username3', 'username4', 'username5', 'username6'],
        };
    },
};
</script>

<style lang="less">
    .kiwi-salert-content {
        font-family: Source Sans Pro, Helvetica, sans-serif;
        margin-bottom: -20px;
    }

    .kiwi-salert-content h1 {
        margin: 0 0 20px 0;
        padding: 0;
    }
</style>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
