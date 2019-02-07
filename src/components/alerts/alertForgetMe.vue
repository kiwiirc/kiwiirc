<template>
    <div class="kiwi-salert-content">
        <h1>Delete local data?</h1>
        <p>Are you sure you want to delete all locally stored data?.
        This action cannot be undone.</p>
    </div>
</template>

<script>
'kiwi public';

export default {
    data: function data() {
        return {
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

    .swal-overlay {
        background-color: rgba(84, 84, 84, 0.6);
    }

    .swal-button-danger {
        background-color: #cc5656;
        transition: background-color 0.3s;
    }
</style>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
