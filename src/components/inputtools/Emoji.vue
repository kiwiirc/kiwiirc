<template>
    <div class="kiwi-inputtool-emoji">
        <div class="kiwi-inputtool-emoji-palette" @mousedown.prevent @click.prevent>
            <div
                v-for="(text, eCode) in emojis"
                :key="eCode"
                :style="{'background-image':`url(${location}${eCode}.png)`}"
                :data-code="text + ' '"
                class="kiwi-inputtool-emoji-emoji"
                @click="onImgClick"
            />
        </div>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import state from '@/libs/state';
import * as Misc from '@/helpers/Misc';

export default {
    props: ['ircinput'],
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
    methods: {
        onImgClick: function onImgClick(event) {
            let url = window.getComputedStyle(event.target, null)
                .getPropertyValue('background-image');

            url = Misc.extractURL(url);
            let code = event.target.dataset.code;
            this.ircinput.addImg(code, url);
        },
    },
};
</script>

<style>
.kiwi-inputtool-emoji-palette {
    text-align: center;
    border: 3px solid;
    border-bottom: 0;
    padding: 10px 5px 0 5px;
    display: block;
    overflow: hidden;
    width: 89%;
    margin: 0 auto;
    border-radius: 10px 10px 0 0;
    box-sizing: border-box;
}

.kiwi-inputtool-emoji-emoji {
    display: inline-block;
    height: 30px;
    width: 30px;
    cursor: pointer;
    box-sizing: border-box;
    margin: 0 4px;
    background-size: contain;
}

@media screen and (max-width: 769px) {
    .kiwi-inputtool-emoji-palette {
        width: 100%;
        border-left: 0;
        border-right: 0;
        border-radius: 0;
    }
}

</style>
