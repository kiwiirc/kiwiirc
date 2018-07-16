<template>
    <div :class="{results: giphy_image_array.length}" class="kiwi-inputtool-giphy">
        <a
            class="u-button u-button-warning kiwi-mediaviewer-controls-close kiwi-close-icon"
            @click="closeGiphy"
        >
            <i class="fa fa-window-close" aria-hidden="true"/>
        </a>
        <div class="kiwi-giphy-input">
            <form class="u-form kiwi-giphy-search-form">
                <label for="kiwi-giphy-search">
                    <span> Search Giphy </span>
                    <input id="kiwi-giphy-search" ref="kiwiGifySearch" type="text"
                           placeholder="Search Giphy..."
                           @input="updateImages($event.target.value)"/>
                    <div class="kiwi-giphy-clear" @click="clearSearch()">
                        <i class="fa fa-times" aria-hidden="true"/>
                    </div>
                </label>
            </form>
        </div>

        <div class="kiwi-giphy-container">
            <img
                v-for="item in giphy_image_array"
                :key="item"
                :src="item"
                class="kiwi-giphy-images"
                @click="onImgClick"
            />
            <p v-if="giphy_image_array.length === 0 && giphy_searchString != ''"
               class="kiwi_no_gifs">
                <i class="fa fa-spin fa-spinner" aria-hidden="true"/>
            </p>
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
            giphy_searchString: '',
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
        updateImages: function updateImages(searchString) {
            let self = this;
            let imageData;
            let apiString = 'http://api.giphy.com/v1/gifs/search?q=' + searchString + '&api_key=L6PXwfcWjNM4PR7c5QVpdOUxRqv24XDy&limit=35';
            let xhttp = new XMLHttpRequest();
            this.giphy_searchString = searchString;
            xhttp.onreadystatechange = function() {
                let i;
                imageData = this.responseText;
                imageData = JSON.parse(imageData);
                imageData = imageData.data;
                for (i = 0; i < imageData.length; i++) {
                    self.$set(self.giphy_image_array, i, imageData[i].images.original.url);
                }
            };

            xhttp.open('GET', apiString, true);
            xhttp.send();
        },
        clearSearch: function clearSearch() {
            this.giphy_image_array = [];
            this.giphy_searchString = '';
            this.$refs.kiwiGifySearch.value = '';
        },
        onImgClick: function onImgClick(img) {
            let imgSource = img.srcElement.src;
            state.$emit('input.raw', imgSource);
        },
        closeGiphy: function closeGiphy() {
            this.$parent.active_tool = null;
        },
    },
};
</script>

<style>

.kiwi-controlinput-active-tool {
    width: 100%;
}

.kiwi-inputtool-giphy {
    display: block;
    overflow-x: hidden;
    overflow-y: scroll;
    transition: height 0.2s;
}

.kiwi-inputtool-giphy.results {
    height: 350px;
}

.kiwi-giphy-input {
    display: block;
    padding: 20px 0;
    text-align: center;
}

.kiwi-giphy-search-form {
    display: inline-block;
    max-width: 320px;
    position: relative;
}

.kiwi-giphy-clear {
    position: absolute;
    top: 50%;
    right: 15px;
    z-index: 10;
    margin-top: -3px;
    cursor: pointer;
    transition: all 0.3s;
}

.kiwi-giphy-clear:hover {
    color: red;
}

.kiwi-giphy-container {
    display: block;
    text-align: center;
}

.kiwi_no_gifs {
    font-size: 2em;
}

.kiwi-giphy-images {
    display: inline-block;
    margin: 0 0.5%;
    height: 150px;
    cursor: pointer;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
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
