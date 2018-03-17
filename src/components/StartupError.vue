<template>
    <div class="kiwi-wrap kiwi-wrap-error">
        <h2>{{$t('error_starting')}}</h2>
        <h3>{{$t('error_installed')}}</h3>
    </div>
</template>

<script>

export default {
};
</script>

<style>
html {
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    height: 100%;
    margin: 0;
    padding: 0;
}

.kiwi-wrap {
    height: 100%;
    overflow: hidden;
}

.kiwi-wrap-error {
    text-align: center;
}

</style>
