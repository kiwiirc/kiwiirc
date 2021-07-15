<template>
    <div class="kiwi-inputtool-emoji">
        <div class="kiwi-inputtool-emoji-palette" @mousedown.prevent @click.prevent>
            <div
                v-for="(text, eCode) in emojis"
                :key="eCode"
                :style="{'background-image':`url(${location}${eCode})`}"
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
import * as Misc from '@/helpers/Misc';

export default {
    props: ['ircinput'],
    computed: {
        emojis() {
            let list = {};
            let available = this.$state.setting('emojis');
            _.each(available, (code, ascii) => {
                if (!code) {
                    // Emoji has an empty value, skip
                    return;
                }
                list[code] = ascii;
            });
            return list;
        },
        location() {
            return this.$state.setting('emojiLocation');
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
