<template>
    <div class="kiwi-wrap kiwi-error">
        <img
            src="../res/salvadorkatz_kiwi.png"
            title="deviantart.com/salvadorkatz [CC BY-NC-ND 3.0]"
            alt=""
        >
        <h2>There was a problem starting <span class="kiwi-name">Kiwi IRC</span></h2>
        <span class="kiwi-error-text">{{ error }}</span>
    </div>
</template>

<script>
'kiwi public';

export default {
    props: ['error'],
};
</script>

<style lang="less">
.kiwi-wrap.kiwi-error {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: center;
    justify-content: center;
    height: 100%;
    overflow: auto;
    color: #000;

    .kiwi-name {
        color: #379a79;
    }

    > img {
        max-width: 90vw;
        max-height: 60vh;
    }

    > span {
        display: inline-block;
        padding: 1em;
        margin: 0.5em 1em 0;
        font-size: 1.2em;
        text-align: left;
        background: #ffbaba;
        border: 2px solid #b51111;
    }
}
</style>
