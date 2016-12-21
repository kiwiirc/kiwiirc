<template>
    <div class="kiwi-mediaviewer">
        <div class="kiwi-mediaviewer-controls">
            <a
                class="u-button u-button-warning kiwi-mediaviewer-controls-close"
                @click="closeViewer"
            >
                <i class="fa fa-window-close" aria-hidden="true"></i>
            </a>
        </div>
        <div :key="url">
            <a v-bind:href="url" class="embedly-card">Loading {{url}}...</a>
        </div>
    </div>
</template>

<script>

import state from 'src/libs/state';

let embedlyTagIncluded = false;

export default {
    data: function data() {
        return {
        };
    },
    props: ['url'],
    methods: {
        updateEmbed: function updateEmbed() {
            let checkEmbedlyAndShowCard = () => {
                // If the embedly function doesn't exist it's probably still loading
                // the embedly script
                if (typeof window.embedly !== 'function') {
                    setTimeout(checkEmbedlyAndShowCard, 100);
                    return;
                }

                window.embedly('card', { selector: '.embedly-card' });
            };

            if (!embedlyTagIncluded) {
                let head = document.getElementsByTagName('head')[0];
                let script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = '//cdn.embedly.com/widgets/platform.js';
                head.appendChild(script);
                embedlyTagIncluded = true;
            }

            checkEmbedlyAndShowCard();
        },
        closeViewer: function closeViewer() {
            state.$emit('mediaviewer.hide');
        },
    },
};

</script>

<style>
.kiwi-mediaviewer {
    box-sizing: border-box;
}
</style>
