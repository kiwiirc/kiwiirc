<template>
    <div class="kiwi-salert-content">
        <div class="kiwi-salert-title">
            <h1>Delete local data?</h1>
        </div>
        <div class="kiwi-salert-content-container">
            <p>Are you sure you want to delete all locally stored data?. <br>
                This action cannot be undone.</p>
        </div>
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

    .kiwi-salert-title,
    .kiwi-salert-content-container {
        width: 100%;
        text-align: left;
        color: #22221f;
        padding: 8px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        margin: 0;
        box-sizing: border-box;

        h1 {
            margin: 0;
            padding: 0;
            font-size: 1.4em;
        }

        p {
            margin: 0;
        }
    }

    .kiwi-salert-content-container {
        padding-bottom: 10px;
        margin-bottom: 10px;
    }

    .swal-content {
        padding: 0;
        margin: 0;
    }

    .swal-footer {
        display: inline-block;
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        text-align: center;
    }

    .swal-overlay {
        background-color: rgba(19, 19, 18, 0.7);
    }

    .swal-button-danger {
        background-color: #cc5656;
        transition: background-color 0.3s;
    }
</style>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
