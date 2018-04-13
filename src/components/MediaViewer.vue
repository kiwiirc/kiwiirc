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
            <a
                v-bind:href="url"
                class="embedly-card"
                :data-card-key="embedlyKey"
                data-card-chrome="0"
                data-card-controls="0"
                data-card-recommend="0"
            >{{$t('media_loading', {url: url})}}</a>
        </div>
    </div>
</template>

<script>

import state from '@/libs/state';

let embedlyTagIncluded = false;

export default {
    data: function data() {
        return {
        };
    },
    props: ['url', 'iframe'],
    computed: {
        embedlyKey: function embedlyKey() {
            return state.settings.embedly.key;
        },
    },
    methods: {
        updateEmbed: function updateEmbed() {
            let checkEmbedlyAndShowCard = () => {
                let el = document.getElementsByClassName('kiwi-mediaviewer')[0];
                // If the embedly function doesn't exist it's probably still loading
                // the embedly script
                if (typeof window.embedly !== 'function' || typeof el === 'undefined') {
                    setTimeout(checkEmbedlyAndShowCard, 100);
                    return;
                }
                if (state.settings.mediaviewerIframe) {
                    if (typeof document.getElementsByClassName('embedly-card')[0] !== 'undefined') {
                        document.getElementsByClassName('embedly-card')[0].innerHTML = '';
                    }
                    let iframe = document.createElement('iframe');
                    iframe.className = 'mediaviewerIframe';
                    iframe.style.height = iframe.style.width = '100%';
                    iframe.style.position = 'absolute';
                    iframe.style.top = 0;
                    iframe.src = state.settings.mediaviewerUrl;
                    el.appendChild(iframe);
                } else {
                    if (typeof document.getElementsByClassName('mediaviewerIframe')[0] !== 'undefined') {
                        document.getElementsByClassName('mediaviewerIframe')[0].parentNode.removeChild(document.getElementsByClassName('mediaviewerIframe')[0]);
                    }
                    state.settings.mediaviewerIframe = false;
                    window.embedly('card', { selector: '.embedly-card' });
                }
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
            state.settings.mediaviewerIframe = false;
            state.$emit('mediaviewer.hide');
        },
    },
    created: function created() {
        this.updateEmbed();
    },
    mounted: function mounted() {
        this.$nextTick(() => {
            state.$emit('mediaviewer.opened');
        });
    },
    watch: {
        url: function watchUrl() {
            this.updateEmbed();
        },
    },
};

</script>

<style>
.kiwi-mediaviewer {
    box-sizing: border-box;
}

.kiwi-mediaviewer-controls {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
}

.kiwi-mediaviewer-controls-close {
    padding: 3px 15px;
}
</style>
