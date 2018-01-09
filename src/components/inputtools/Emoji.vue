<template>
    <div class="kiwi-inputtool-emoji">
        <div class="kiwi-inputtool-emoji-palette" @mousedown.prevent @click.prevent>
            <div v-for="(text, eCode) in emojis" class="kiwi-inputtool-emoji-emoji"
                    @click="onImgClick" :style="{'background-image':`url(${location}${eCode}.png)`}" :data-code="text + ' '"></div>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import state from '@/libs/state';

export default {
    data: function data() {
        return {
            location: state.setting('emojiLocation'),
        };
    },
    computed: {
        emojis() {
            let list = {};
            let available = state.setting('emojis');
            _.each(available, (code, ascii) => {
                list[code] = ascii;
            });
            return list;
        },
    },
    props: ['ircinput'],
    methods: {
        onImgClick: function onImgClick(event) {
            let url = window.getComputedStyle(event.target, null)
                .getPropertyValue('background-image');

            // TODO: All this text replacing is ugly. Tidy it pls.
            url = url.replace('url(', '').replace(')', '');
            url = url.replace(' ', '').replace(/"/g, '');
            let code = event.target.dataset.code;
            this.ircinput.addImg(code, url);
        },
    },
};
</script>

<style>

.kiwi-inputtool-emoji-emoji {
    display: block;
    float: left;
    height: 30px;
    width: 30px;
    cursor: pointer;
    box-sizing: border-box;
    margin: 2px;
    background-size: contain;
}

</style>
