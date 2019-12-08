<template>
    <div class="kiwi-inputtool-colours">
        <div class="kiwi-inputtool-colours-palette" @mousedown.prevent @click.prevent>
            <div class="kiwi-inputtool-colour-actions" >
                <div class="kiwi-inputtool-button" @click="showModernPalette = !showModernPalette">
                    <i v-if="!showModernPalette" class="fa fa-chevron-down" aria-hidden="true" />
                    <i v-else class="fa fa-chevron-up" aria-hidden="true" />
                </div>
            </div>

            <div class="kiwi-inputtools-colour-container">
                <div :class="{active: !showModernPalette}" class="kiwi-inputtools-colours">
                    <div v-for="n in 15"
                         :key="n"
                         :class="['irc-bg-colour-' + n]"
                         :data-code="[n.toString().padStart(2, '0')]"
                         class="kiwi-inputtools-colours-colour"
                         @click="onColourClick"
                    />
                </div>

                <div :class="{active: showModernPalette}" class="kiwi-inputtools-colours">
                    <div v-for="n in 98"
                         v-if="n >= 15"
                         :key="n"
                         :class="['irc-bg-colour-' + n]"
                         :data-code="[n]"
                         class="kiwi-inputtools-colours-colour"
                         @click="onColourClick"
                    />
                </div>
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
        onColourClick(event) {
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
    padding-right: 60px;
    position: relative;
    height: 100px;
    overflow: hidden;
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

.kiwi-inputtools-colour-container {
    display: block;
    min-height: 90px;
}

.kiwi-inputtools-colours {
    box-sizing: border-box;
    padding: 10px 5px 0 10px;
    opacity: 0;
    max-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    transition: all 0.3s;
}

.kiwi-inputtools-colours.active {
    max-height: 90px;
    opacity: 1;
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

.kiwi-inputtool-colour-actions {
    position: absolute;
    right: 0;
    top: 0;
    width: 60px;
    box-sizing: border-box;
    padding: 29px 0;
    text-align: center;
    height: 100%;
    border-left: 1px solid;
}

.kiwi-inputtool-colour-actions .kiwi-inputtool-button {
    display: inline-block;
    letter-spacing: 1px;
    cursor: pointer;
    border: 1px solid;
    border-radius: 50%;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.kiwi-inputtool-colour-actions .kiwi-inputtool-button i {
    display: block;
    width: 40px;
    height: 40px;
    text-align: center;
    line-height: 40px;
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
