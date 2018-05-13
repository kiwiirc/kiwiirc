<template>
    <div class="kiwi-inputtool-colours">
        <div class="kiwi-inputtool-colours-palette" @mousedown.prevent @click.prevent>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-white"
                    @click="onColourClick" data-code="00"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-black"
                    @click="onColourClick" data-code="01"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-blue"
                    @click="onColourClick" data-code="02"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-green"
                    @click="onColourClick" data-code="03"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-red"
                    @click="onColourClick" data-code="04"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-brown"
                    @click="onColourClick" data-code="05"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-purple"
                    @click="onColourClick" data-code="06"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-orange"
                    @click="onColourClick" data-code="07"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-yellow"
                    @click="onColourClick" data-code="08"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-green"
                    @click="onColourClick" data-code="09"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-cyan"
                    @click="onColourClick" data-code="10"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-cyan"
                    @click="onColourClick" data-code="11"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-blue"
                    @click="onColourClick" data-code="12"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-pink"
                    @click="onColourClick" data-code="13"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-grey"
                    @click="onColourClick" data-code="14"></div>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-grey"
                    @click="onColourClick" data-code="15"></div>
            <div class="kiwi-inputtools-colours-colour kiwi-inputtools-colours-reset"
                    @click="onResetClick"><i class="fa fa-ban" aria-hidden="true"></i></div>
            <div class="kiwi-inputtools-colours-colour kiwi-inputtools-colours-img"
                    @click="onImgClick" style="background-image:url(/static/emoticons/smile.png);" data-code=":D"></div>
        </div>
    </div>
</template>

<script>

export default {
    data: function data() {
        return {
        };
    },
    props: ['ircinput'],

    methods: {
        onColourClick: function onColourClick(event) {
            let colour = window.getComputedStyle(event.target, null)
                .getPropertyValue('background-color');
            let code = event.target.dataset.code;
            this.ircinput.setColour(code, colour);
        },
        onImgClick: function onImgClick(event) {
            let url = window.getComputedStyle(event.target, null)
                .getPropertyValue('background-image');

            // TODO: All this text replacing is ugly. Tidy it pls.
            url = url.replace('url(', '').replace(')', '');
            url = url.replace(' ', '').replace(/"/g, '');
            let code = event.target.dataset.code;
            this.ircinput.addImg(code, url);
        },
        onResetClick: function onResetClick() {
            this.ircinput.resetStyles();
        },
    },
};
</script>

<style lang="less">

.kiwi-inputtools-colours {
    bottom: 100%;
    right: 0;
    overflow: hidden;
    position: absolute;
    height: 30px;
}

.kiwi-inputtools-colours-colour {
    display: block;
    float: left;
    height: 30px;
    width: 30px;
    cursor: pointer;
    box-sizing: border-box;
    border: 1px solid gray;
    margin: 0;
}

.kiwi-inputtools-colours-img {
    background-size: contain;
}

.kiwi-inputtools-colours-reset {
    font-size: 23px;
    line-height: 30px;
    text-align: center;
    background: #000;
    color: #cacaca;
}

</style>
