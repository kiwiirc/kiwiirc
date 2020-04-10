<template>
    <div class="kiwi-inputtool-colours">
        <div class="kiwi-inputtool-colours-palette" @mousedown.prevent @click.prevent>
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-white"
                 data-code="00" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-black"
                 data-code="01" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-blue"
                 data-code="02" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-green"
                 data-code="03" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-red"
                 data-code="04" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-brown"
                 data-code="05" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-purple"
                 data-code="06" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-orange"
                 data-code="07" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-yellow"
                 data-code="08" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-green"
                 data-code="09" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-cyan"
                 data-code="10" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-cyan"
                 data-code="11" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-blue"
                 data-code="12" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-pink"
                 data-code="13" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-grey"
                 data-code="14" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour irc-bg-colour-light-grey"
                 data-code="15" @click="onColourClick"
            />
            <div class="kiwi-inputtools-colours-colour kiwi-inputtools-colours-reset"
                 @click="onResetClick"
            ><i class="fa fa-ban" aria-hidden="true" /></div>
        </div>
    </div>
</template>

<script>
'kiwi public';

import * as Colours from '@/helpers/Colours';

export default {
    props: ['ircinput'],
    data: function data() {
        return {
        };
    },

    methods: {
        onColourClick: function onColourClick(event) {
            let colour = window.getComputedStyle(event.target, null)
                .getPropertyValue('background-color');
            // Convert rgb(x,x,x) to its hex form
            let m = colour.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            if (m) {
                let rgbObj = {
                    r: parseInt(m[1], 10),
                    g: parseInt(m[2], 10),
                    b: parseInt(m[3], 10),
                };
                colour = Colours.rgb2hex(rgbObj);
            }

            let code = event.target.dataset.code;
            this.ircinput.setColour(code, colour);
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

.kiwi-inputtools-colours-reset {
    font-size: 23px;
    line-height: 30px;
    text-align: center;
    background: #000;
    color: #cacaca;
}

</style>
