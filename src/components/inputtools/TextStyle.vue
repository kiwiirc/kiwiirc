<template>
    <div class="kiwi-inputtool-colours">
        <div class="kiwi-inputtool-colours-palette" @mousedown.prevent @click.prevent>
            <div :class="{active: !showModernPalette}"
                 class="kiwi-inputtool-colour-button"
                 @click="showModernPalette = !showModernPalette"
            >
                <i v-if="!showModernPalette"
                   class="fa fa-plus" aria-hidden="true" />
                <i v-if="showModernPalette"
                   class="fa fa-minus" aria-hidden="true" />
            </div>

            <div v-if="!showModernPalette"
                 class="kiwi-inputtools-colours">
                <div v-for="n in 15"
                     :key="n"
                     :class="['irc-bg-colour-' + n]"
                     :data-code="[n]"
                     class="kiwi-inputtools-colours-colour"
                     @click="onColourClick" />
            </div>

            <div v-else
                 class="kiwi-inputtools-colours">
                <div v-for="n in 98"
                     v-if="n >= 15"
                     :key="n"
                     :class="['irc-bg-colour-' + n]"
                     :data-code="[n]"
                     class="kiwi-inputtools-colours-colour"
                     @click="onColourClick" />
            </div>
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
            showModernPalette: false,
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

<style lang="less" scroped>
.kiwi-inputtool-colours-palette {
    padding-right: 50px;
    position: relative;
}

.kiwi-inputtool-colours {
    display: inline-block;
    width: 575px;
    margin: 0 auto;
    position: relative;
    bottom: -7px;
    border: 1px solid;
    border-bottom: 0;
    border-radius: 10px 10px 0 0;
}

.kiwi-inputtools-colours {
    box-sizing: border-box;
    padding: 10px 5px 0 10px;
    height: 90px;
    overflow-y: auto;
    overflow-x: hidden;
}

.kiwi-inputtools-colours-colour {
    display: block;
    float: left;
    height: 34px;
    width: 34px;
    cursor: pointer;
    box-sizing: border-box;
    border: 1px solid;
    margin: 0 5px 5px 2px;
    border-radius: 4px;
}

.kiwi-inputtool-colour-button {
    position: absolute;
    right: 0;
    top: 0;
    width: 50px;
    height: 100%;
    border-left: 1px solid;
}

.kiwi-inputtool-colour-button i {
    width: 40px;
    text-align: center;
    line-height: 40px;
    font-size: 1.4em;
    height: 40px;
    margin: 10px 5px;
    border: 1px solid;
    border-radius: 50%;
    transition: color 0.2s, background 0.2s;
    cursor: pointer;
}

@media screen and (max-width: 860px) {
    .kiwi-inputtool-colours {
        width: 100%;
        border-radius: 0;
        border-left: 0;
        border-right: 0;
    }
}

</style>
