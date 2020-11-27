<template>
    <div ref="mediaviewer" class="kiwi-mediaviewer">
        <div class="kiwi-mediaviewer-controls">
            <a
                v-if="showPin"
                class="u-button u-link kiwi-mediaviewer-controls-pin"
                @click="$emit('pin')"
            >
                <i class="fa fa-map-pin" aria-hidden="true" />
            </a>
            <a
                class="u-button u-button-warning kiwi-mediaviewer-controls-close"
                @click="$emit('close');"
            >
                <i class="fa fa-window-close" aria-hidden="true" />
            </a>
        </div>
        <iframe
            v-if="isIframe"
            :src="url"
            class="kiwi-mediaviewer-iframe"
        />
        <component :is="component" v-else-if="component" :component-props="componentProps" />
        <iframe
            v-else-if="!embedlyKey"
            ref="embedFrame"
            frameborder="0"
            height="0"
            width="100%"
            class="kiwi-mediaviewer-embed"
        />
        <div v-else :key="url" class="kiwi-mediaviewer-embedly">
            <a
                ref="embedlyLink"
                :href="url"
                :data-card-key="embedlyKey"
                class="kiwi-embedly-card"
                data-card-chrome="0"
                data-card-controls="0"
                data-card-recommend="0"
            >{{ $t('media_loading', {url: url}) }}</a>
        </div>
    </div>
</template>

<script>
'kiwi public';

let embedlyTagIncluded = false;

export default {
    props: ['url', 'component', 'componentProps', 'isIframe', 'showPin'],
    data() {
        return {
            addedEventListener: false,
        };
    },
    computed: {
        embedlyKey() {
            return this.$state.settings.embedly.key;
        },
        embedding() {
            return this.$state.setting('embedding');
        },
    },
    watch: {
        url() {
            this.updateEmbed();
        },
        isIframe() {
            this.updateEmbed();
        },
    },
    mounted() {
        this.updateEmbed();
        this.$nextTick(() => {
            this.$state.$emit('mediaviewer.opened');
        });
    },
    beforeDestroy() {
        if (this.eventListener) {
            // Cleanup message event listener
            window.removeEventListener('message', this.messageEventHandler);
            this.addedEventListener = false;
        }
    },
    methods: {
        updateEmbed() {
            if (!this.url || this.isIframe || this.component) {
                // This is not going to be handled by our embedding or embedly
                // Stop hiding the media viewer as we are not controlling its height
                this.$refs.mediaviewer.style.height = 'auto';
                return;
            }

            if (!this.embedlyKey) {
                const iframe = this.$refs.embedFrame;
                if (!iframe) {
                    // No iframe to work with so nothing to update
                    return;
                }

                let newUrl = this.embedding.url
                    .replace('{url}', this.url)
                    .replace('{center}', !this.showPin)
                    .replace('{width}', this.embedding.maxWidth || 1000)
                    .replace('{height}', this.embedding.maxHeight || 400);

                // Set the iframe url
                iframe.src = newUrl;

                // Add message event listener if it does not exist
                if (!this.eventListener) {
                    window.addEventListener('message', this.messageEventHandler);
                    this.addedEventListener = true;
                }
                return;
            }

            let checkEmbedlyAndShowCard = () => {
                // If the embedly function doesn't exist it's probably still loading
                // the embedly script
                if (typeof window.embedly !== 'function') {
                    setTimeout(checkEmbedlyAndShowCard, 100);
                    return;
                }
                this.$nextTick(() => {
                    this.$refs.mediaviewer.style.height = 'auto';
                    window.embedly('card', this.$refs.embedlyLink);
                });
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
        messageEventHandler(event) {
            const iframe = this.$refs.embedFrame;
            if (!iframe || event.source !== iframe.contentWindow) {
                // The message event did not come from our iframe ignore it
                return;
            }

            const data = event.data;
            if (data.error) {
                // Error message indicates the url cannot be embedded
                this.$emit('close');
            } else if (data.dimensions) {
                // Dimensions message contains updated dimensions for the iframe content
                const height = Math.min(data.dimensions.height, this.embedding.maxHeight || 400);
                iframe.height = height + 'px';

                // Now we have dimensions stop hiding the media viewer
                // This is to stop the message list jumping when opened with invalid url
                this.$refs.mediaviewer.style.height = 'auto';
            }
        },
    },
};
</script>

<style>
.kiwi-mediaviewer {
    box-sizing: border-box;
    position: relative;
    height: 0;
}

.kiwi-mediaviewer-controls {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
    background: var(--brand-default-bg);
    border-radius: 5px;
    padding: 3px;
    opacity: 0;
    transition: opacity 0.1s;
    box-shadow: 0 1px var(--brand-input-border);
}

.kiwi-mediaviewer:hover .kiwi-mediaviewer-controls {
    opacity: 1;
}

.kiwi-mediaviewer-controls-close {
    padding: 3px 15px;
}

.kiwi-mediaviewer-iframe {
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    border: none;
}

.embedly-card {
    margin: 10px 0;
    display: inline-block;
}

.embedly-card-hug {
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 5px;
    background: #fff;
}
</style>
