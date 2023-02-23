<!-- eslint-disable max-len -->
<template>
    <div class="kiwi-inputtools-style" @mousedown.prevent @click.prevent>
        <div class="kiwi-inputtools-sample" :style="sampleStyle">Sample Text</div>
        <div class="kiwi-inputtools-style-top">
            <div class="kiwi-inputtools-style-grid kiwi-inputtools-style-base">
                <div
                    v-for="colourCode in Array(16).keys()"
                    :key="'colour'+colourCode"
                    class="kiwi-inputtools-style-button"
                    :class="'irc-bg-colour-' + colourCode"
                    :data-code="colourCode"
                    @click="onColourClick"
                >&nbsp;</div>
            </div>
            <div class="kiwi-inputtools-style-grid kiwi-inputtools-style-modifiers">
                <div
                    class="kiwi-inputtools-style-button"
                    :class="{'kiwi-inputtools-style--disabled': bgColourDisabled}"
                    :title="toggleColourTitle"
                    @click="toggleColour"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path v-if="fgColour" d="M448 256c0-106-86-192-192-192V448c106 0 192-86 192-192zm64 0c0 141.4-114.6 256-256 256S0 397.4 0 256S114.6 0 256 0S512 114.6 512 256z" />
                        <path v-else d="M448 256c0-106-86-192-192-192V448c106 0 192-86 192-192zm64 0c0 141.4-114.6 256-256 256S0 397.4 0 256S114.6 0 256 0S512 114.6 512 256z" transform="rotate(180, 256, 256)" />
                    </svg>
                </div>

                <div
                    class="kiwi-inputtools-style-button"
                    title="Bold"
                    @click="toggleStyle('bold')"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path d="M0 64C0 46.3 14.3 32 32 32H80 96 224c70.7 0 128 57.3 128 128c0 31.3-11.3 60.1-30 82.3c37.1 22.4 62 63.1 62 109.7c0 70.7-57.3 128-128 128H96 80 32c-17.7 0-32-14.3-32-32s14.3-32 32-32H48V256 96H32C14.3 96 0 81.7 0 64zM224 224c35.3 0 64-28.7 64-64s-28.7-64-64-64H112V224H224zM112 288V416H256c35.3 0 64-28.7 64-64s-28.7-64-64-64H224 112z" />
                    </svg>
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    title="Italic"
                    @click="toggleStyle('italic')"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path d="M128 64c0-17.7 14.3-32 32-32H352c17.7 0 32 14.3 32 32s-14.3 32-32 32H293.3L160 416h64c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H90.7L224 96H160c-17.7 0-32-14.3-32-32z" />
                    </svg>
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    title="Underline"
                    @click="toggleStyle('underline')"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path d="M16 64c0-17.7 14.3-32 32-32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H128V224c0 53 43 96 96 96s96-43 96-96V96H304c-17.7 0-32-14.3-32-32s14.3-32 32-32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H384V224c0 88.4-71.6 160-160 160s-160-71.6-160-160V96H48C30.3 96 16 81.7 16 64zM0 448c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z" />
                    </svg>
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    title="Strikethrough"
                    @click="toggleStyle('strikethrough')"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path d="M161.3 144c3.2-17.2 14-30.1 33.7-38.6c21.1-9 51.8-12.3 88.6-6.5c11.9 1.9 48.8 9.1 60.1 12c17.1 4.5 34.6-5.6 39.2-22.7s-5.6-34.6-22.7-39.2c-14.3-3.8-53.6-11.4-66.6-13.4c-44.7-7-88.3-4.2-123.7 10.9c-36.5 15.6-64.4 44.8-71.8 87.3c-.1 .6-.2 1.1-.2 1.7c-2.8 23.9 .5 45.6 10.1 64.6c4.5 9 10.2 16.9 16.7 23.9H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H270.1c-.1 0-.3-.1-.4-.1l-1.1-.3c-36-10.8-65.2-19.6-85.2-33.1c-9.3-6.3-15-12.6-18.2-19.1c-3.1-6.1-5.2-14.6-3.8-27.4zM348.9 337.2c2.7 6.5 4.4 15.8 1.9 30.1c-3 17.6-13.8 30.8-33.9 39.4c-21.1 9-51.7 12.3-88.5 6.5c-18-2.9-49.1-13.5-74.4-22.1c-5.6-1.9-11-3.7-15.9-5.4c-16.8-5.6-34.9 3.5-40.5 20.3s3.5 34.9 20.3 40.5c3.6 1.2 7.9 2.7 12.7 4.3l0 0 0 0c24.9 8.5 63.6 21.7 87.6 25.6l0 0 .2 0c44.7 7 88.3 4.2 123.7-10.9c36.5-15.6 64.4-44.8 71.8-87.3c3.6-21 2.7-40.4-3.1-58.1H335.1c7 5.6 11.4 11.2 13.9 17.2z" />
                    </svg>
                </div>
                <div
                    class="kiwi-inputtools-style-button"
                    title="Clear Current Styles"
                    @click="clearStyles()"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path d="M258.7 57.4L25.4 290.7c-25 25-25 65.5 0 90.5l80 80c12 12 28.3 18.7 45.3 18.7H256h9.4H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H355.9L486.6 285.3c25-25 25-65.5 0-90.5L349.3 57.4c-25-25-65.5-25-90.5 0zM265.4 416H256l-105.4 0-80-80L195.3 211.3 332.7 348.7 265.4 416z" />
                    </svg>
                </div>
                <div
                    class="kiwi-inputtools-style-button kiwi-inputtools-style-reset"
                    title="Remove All Styles"
                    @click="onResetClick"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" />
                    </svg>
                </div>
                <div
                    class="kiwi-inputtools-style-button kiwi-inputtools-style-expand"
                    :title="extColours ? 'Hide Extended Colours' : 'Show Extended Colours'"
                    @click="extColours = !extColours"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                        <!-- https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2023 Fonticons, Inc. -->
                        <path v-if="extColours" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160zm352-160l-160 160c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L269.3 256 406.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0z" />
                        <path v-else d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L370.7 256 233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160zm-352 160l160-160c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L178.7 256 41.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0z" />
                    </svg>
                </div>
            </div>
        </div>
        <transition-expand>
            <div
                v-if="extColours"
                class="kiwi-inputtools-style-grid kiwi-inputtools-style-palette"
            >
                <div
                    v-for="colourCode in extendedColourRange"
                    :key="'colour'+colourCode"
                    class="kiwi-inputtools-style-button"
                    :class="'irc-bg-colour-' + colourCode"
                    :data-code="colourCode"
                    @click="onColourClick"
                >&nbsp;</div>
            </div>
        </transition-expand>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as Colours from '@/helpers/Colours';
import TransitionExpand from '../utils/TransitionExpand.vue';

export default {
    components: { TransitionExpand },
    props: ['ircinput'],
    data() {
        return {
            fgColour: true,
            extColours: false,
        };
    },
    computed: {
        sampleStyle() {
            const inputStyle = this.ircinput.style;
            const style = {};

            if (inputStyle.fgColour) {
                style.color = inputStyle.fgColour.hex;
            }

            if (inputStyle.bgColour) {
                style['background-color'] = inputStyle.bgColour.hex;
            }

            if (inputStyle.bold) {
                style['font-weight'] = 'bold';
            }

            if (inputStyle.italic) {
                style['font-style'] = 'italic';
            }

            const textDecoration = [];
            if (inputStyle.underline) {
                textDecoration.push('underline');
            }

            if (inputStyle.strikethrough) {
                textDecoration.push('line-through');
            }

            if (textDecoration.length) {
                style['text-decoration'] = textDecoration.join(' ');
            }

            return style;
        },
        bgColourDisabled() {
            return !this.ircinput.style.fgColour;
        },
        toggleColourTitle() {
            if (this.bgColourDisabled) {
                return 'Set foreground colour first';
            }

            return this.fgColour ?
                'Set background colour' :
                'Set foreground colour';
        },
        extendedColourRange() {
            return _.range(16, 99);
        },
    },
    created() {
        this.extColours = this.$state.setting('showColorPickerExtended');
    },
    methods: {
        toggleColour() {
            if (this.bgColourDisabled) {
                return;
            }
            this.fgColour = !this.fgColour;
        },
        toggleStyle(key) {
            this.ircinput.setStyle({ [key]: !this.ircinput.style[key] });
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

            const code = event.target.dataset.code;
            const styleKey = this.fgColour ? 'fgColour' : 'bgColour';

            this.ircinput.setStyle({
                [styleKey]: {
                    hex: colour,
                    code,
                },
            });
        },
        onResetClick() {
            this.ircinput.clearStyles();
            this.ircinput.resetStyles();
        },
    },
};
</script>

<style lang="less">

.kiwi-inputtools-style {
    display: flex;
    position: absolute;
    bottom: 0;
    right: 0;
    padding: 8px;
    border: 1px solid var(--comp-border);
    border-bottom: 0;
    border-radius: 10px 10px 0 0;
    flex-direction: column;
    background-color: var(--brand-default-bg);
    gap: 4px;
}

.kiwi-inputtools-sample {
    width: 100%;
    padding: 2px;
    border: 1px solid var(--comp-border);
    box-sizing: border-box;
    text-align: center;
    user-select: none;
}

.kiwi-inputtools-style-top {
    display: flex;
}

.kiwi-inputtools-style-grid {
    display: grid;
    column-gap: 4px;
    row-gap: 4px;
}

.kiwi-inputtools-style-base {
    grid-template-columns: repeat(8, 32px);
    grid-template-rows: repeat(2, 32px);
}

.kiwi-inputtools-style-modifiers {
    grid-template-columns: repeat(4, 32px);
    grid-template-rows: repeat(2, 32px);
    margin-left: 4px;
}

.kiwi-inputtools-style-palette {
    grid-template-columns: repeat(12, 32px);
    grid-template-rows: repeat(7, 32px);
}

.kiwi-inputtools-style-button {
    height: 100%;
    width: 100%;
    cursor: pointer;
    border: 2px solid var(--comp-border);
    box-sizing: border-box;
    padding: 2px;

    > svg {
        display: block;
        height: 100%;
        width: 100%;
    }
}

.kiwi-inputtools-style-expand {
    background: var(--brand-primary);

    path {
        fill: var(--brand-default-bg);
    }
}

.kiwi-inputtools-style-reset {
    background: var(--brand-default-fg);
    padding: 4px;

    path {
        fill: var(--brand-default-bg);
    }
}

.kiwi-inputtools-style--disabled {
    cursor: not-allowed;
}

@media screen and (max-width: 769px) {
    .kiwi-inputtools-style {
        padding: 4px;
        max-width: 442px;

        --cell-size: calc(min(100vw - 42px, 446px) / 12);
        --grid-gap: clamp(2px, calc(var(--cell-size) * 0.1213), 4px);
        --button-size: calc(var(--cell-size) - var(--grid-gap));

        .kiwi-inputtools-style-grid {
            column-gap: var(--grid-gap);
            row-gap: var(--grid-gap);
        }

        .kiwi-inputtools-style-base {
            grid-template-columns: repeat(8, var(--button-size));
            grid-template-rows: repeat(2, var(--button-size));
        }
        .kiwi-inputtools-style-modifiers {
            grid-template-columns: repeat(4, var(--button-size));
            grid-template-rows: repeat(2, var(--button-size));
            margin-left: var(--grid-gap);
        }
        .kiwi-inputtools-style-palette {
            grid-template-columns: repeat(12, var(--button-size));
            grid-template-rows: repeat(7, var(--button-size));
        }

        .kiwi-inputtools-style-button {
            padding: clamp(1px, calc(var(--button-size) * 0.0602), 2px);
            border-width: clamp(1px, calc(var(--button-size) * 0.0602), 2px);
        }

        .kiwi-inputtools-style-reset {
            padding: clamp(2px, calc(var(--button-size) * 0.1213), 4px);
        }
    }
}

.kiwi-controlinput--show-tools--inline .kiwi-inputtools-style {
    right: 20px;
}
</style>
