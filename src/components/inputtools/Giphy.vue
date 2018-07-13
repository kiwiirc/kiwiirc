<template>
    <div class="kiwi-inputtool-giphy">
        <div class="kiwi-giphy-input">
            <form class="kiwi-giphy-search-form" v-on:submit="updateImages">
                <input type="text" name="" value="" placeholder="Search Giphy..." id="kiwi-giphy-search" @input="onInput($event.target.value)" />
                <input type="button" name="" value="Search Giphy">
            </form>
        </div>

        <div class='kiwi-giphy-container'>
            <div
                v-for="item in giphy_image_array"
                :key="item"
                :style="{'background-image':`url(${item})`}"
                class="kiwi-giphy-images"
                @click="onImgClick"
            />
        </div>

    </div>
</template>

<script>

import _ from 'lodash';
import state from '@/libs/state';

export default {
    props: ['ircinput'],
    data: function data() {
        return {
            giphy_image_array: [],
            location: state.setting('emojiLocation'),
        };
    },
    computed: {
        giphy_item() {
            let list = {};
            let available = state.setting('emojis');
            _.each(available, (code, ascii) => {
                list[code] = ascii;
            });
            return list;
        },
    },
    methods: {
        updateImages: function updateImages(search_string) {
            var self = this;
            var image_data;
            var api_string = "http://api.giphy.com/v1/gifs/search?q=" + search_string + "&api_key=L6PXwfcWjNM4PR7c5QVpdOUxRqv24XDy&limit=10";
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                image_data = this.responseText;
                image_data = JSON.parse(image_data);
                image_data = image_data.data;
                var i;
                for (i = 0; i < image_data.length; i++) {
                    self.$set(self.giphy_image_array, i, image_data[i].images.original.url);
                }
            };

            xhttp.open("GET", api_string, true);
            xhttp.send();
        },
        onInput: function onInput(input) {
            this.updateImages(input);
        },
        onImgClick: function onImgClick(event) {
            let url = window.getComputedStyle(event.target, null)
                .getPropertyValue('background-image');

            // TODO: All this text replacing is ugly. Tidy it pls.
            url = url.replace('url(', '').replace(')', '');
            url = url.replace(' ', '').replace(/"/g, '');
            let code = event.target.dataset.code;
            this.ircinput.addImg(url, url);
        },
    },
};
</script>

<style>

.kiwi-controlinput-active-tool {
    width: 100%;
    height: 200px;
}

.kiwi-giphy-container {
    display: block;
    width: 100%;
    height: 177px;
    overflow-x: hidden;
    overflow-y: scroll;
}

.kiwi-giphy-images {
    display: inline-block;
    margin: 0;
    width: 150px;
    height: 150px;
    cursor: pointer;
    background-size: contain;
    background-position: center;
}

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
