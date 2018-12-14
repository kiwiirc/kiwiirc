<template>
    <div class="kiwi-wrap kiwi-wrap-error">
        <h2>Kiwi IRC could not start :(</h2>
        <div>{{ error }}</div>
    </div>
</template>

<script>
'kiwi public';

export default {
    props: ['error'],
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
    text-align: center;
}

.kiwi-wrap-error > div {
    margin-top: 0.5em;
    padding: 1em;
    font-size: 1.2em;
    border: 1px solid #b51111;
    background: #ffbaba;
    display: inline-block;
    text-align: left;
}

</style>
