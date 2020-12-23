<template>
    <div class="kiwi-input-textstyle">
        <div class="kiwi-input-textstyle-picker" @mousedown.prevent @click.prevent>
            <div class="kiwi-inputtools-tool-container">
                <div
                    :class="{'kiwi-input-tools-active': isBold}"
                    class="kiwi-input-textstyle-item kiwi-input-textstyle-bold"
                    @click="toggleBold"
                >
                    <i class="fa fa-bold" aria-hidden="true" />
                </div>
                <div
                    :class="{'kiwi-input-tools-active': isItalic}"
                    class="kiwi-input-textstyle-item kiwi-input-textstyle-italic"
                    @click="toggleItalic"
                >
                    <i class="fa fa-italic" aria-hidden="true" />
                </div>
                <div
                    :class="{'kiwi-input-tools-active': isUnderline}"
                    class="kiwi-input-textstyle-item kiwi-input-textstyle-underline"
                    @click="toggleUnderline"
                >
                    <i class="fa fa-underline" aria-hidden="true" />
                </div>
                <div
                    class="kiwi-input-textstyle-item kiwi-input-textstyle-reset"
                    @click="onResetClick"
                ><i class="fa fa-ban" aria-hidden="true" /></div>
                <div
                    :class="{'kiwi-inputtools-colour-container--active': currentColourCode != ''}"
                    class="kiwi-inputtools-colour-container"
                >
                    <!-- eslint-disable max-len -->
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '01'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-black"
                        data-code="01" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '02'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-blue"
                        data-code="02" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '03'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-green"
                        data-code="03" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '04'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-light-red"
                        data-code="04" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '05'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-brown"
                        data-code="05" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '06'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-purple"
                        data-code="06" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '07'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-orange"
                        data-code="07" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '08'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-yellow"
                        data-code="08" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '09'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-light-green"
                        data-code="09" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '10'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-cyan"
                        data-code="10" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '11'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-light-cyan"
                        data-code="11" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '12'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-light-blue"
                        data-code="12" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '13'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-pink"
                        data-code="13" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '14'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-grey"
                        data-code="14" @click="onColourClick"
                    />
                    <div
                        :class="{'kiwi-input-textstyle--active': currentColourCode === '15'}"
                        class="kiwi-input-textstyle-item kiwi-inputtools-colour irc-bg-colour-light-grey"
                        data-code="15" @click="onColourClick"
                    />
                    <!-- eslint-enable max-len -->
                    <div
                        class="kiwi-inputtools-colours-colour kiwi-inputtools-colours-reset"
                        @click="onResetClick"
                    ><i class="fa fa-ban" aria-hidden="true" /></div>
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
    data() {
        return {
            isBold: false,
            isItalic: false,
            isUnderline: false,
            currentColourCode: '',
        };
    },
    methods: {
        toggleBold() {
            this.isBold = !this.isBold;
            this.isItalic = false;
            this.isUnderline = false;
            this.currentColourCode = '';
            this.ircinput.toggleBold();
        },
        toggleItalic() {
            this.isBold = false;
            this.isItalic = !this.isItalic;
            this.isUnderline = false;
            this.currentColourCode = '';
            this.ircinput.toggleItalic();
        },
        toggleUnderline() {
            this.isBold = false;
            this.isItalic = false;
            this.isUnderline = !this.isUnderline;
            this.currentColourCode = '';
            this.ircinput.toggleUnderline();
        },
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
            this.isBold = false;
            this.isItalic = false;
            this.isUnderline = false;
            this.currentColourCode = code;
            this.ircinput.setColour(code, colour);
        },
        onResetClick() {
            this.isBold = false;
            this.isItalic = false;
            this.isUnderline = false;
            this.currentColourCode = '';
            this.ircinput.resetStyles();
        },
    },
};
</script>

<style lang="less">
.kiwi-controlinput-active-tool {
    border-radius: 6px 0 0 0;
    overflow: hidden;
}

.kiwi-input-textstyle {
    bottom: 100%;
    width: 200px;
    z-index: 1;
}

.kiwi-inputtools-tool-container,
.kiwi-inputtools-colour-container {
    width: 100%;
}

.kiwi-inputtools-colour-container {
    border-top: 1px solid #000;
    overflow: hidden;
}

.kiwi-input-textstyle-item {
    float: left;
    height: 30px;
    width: 50px;
    cursor: pointer;
    box-sizing: border-box;
    text-align: center;
    font-size: 23px;
    line-height: 30px;
    user-select: none;
    display: inline-block;
}

.kiwi-inputtools-tool-container .kiwi-input-textstyle-item {
    font-size: 1em;
    transition: all 0.2s;
}

.kiwi-inputtools-tool-container .kiwi-input-textstyle-item.kiwi-input-tools-active {
    background: #42b992;
    color: #fff;
}

.kiwi-inputtools-colour {
    margin: 0;
    float: left;
    transition: all 0.3s;
}

.kiwi-inputtools-colour-container:hover .kiwi-inputtools-colour,
.kiwi-inputtools-colour-container--active .kiwi-inputtools-colour {
    opacity: 0.2;
}

// eslint-disable max-len
.kiwi-inputtools-colour-container:hover .kiwi-inputtools-colour:hover,
.kiwi-inputtools-colour-container--active .kiwi-inputtools-colour.kiwi-input-textstyle--active {
    opacity: 1;
}

.kiwi-input-textstyle-bold {
    font-weight: 600;
}

.kiwi-input-textstyle-italic {
    font-style: italic;
}

.kiwi-input-textstyle-underline {
    text-decoration: underline;
}

.kiwi-input-textstyle-reset {
    background: #000;
    color: #cacaca;
}

</style>
