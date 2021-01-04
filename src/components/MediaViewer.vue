<template>
    <div class="kiwi-mediaviewer">
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
        <div v-if="error" class="kiwi-mediaviewer-error">
            {{ error }}
        </div>
        <iframe
            v-else-if="isIframe"
            :src="url"
            :sandbox="iframeSandboxOptions"
            class="kiwi-mediaviewer-iframe"
        />
        <component :is="component" v-else-if="component" :component-props="componentProps" />
        <iframe
            v-else-if="!embedlyKey"
            ref="embedFrame"
            :sandbox="iframeSandboxOptions"
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

import _ from 'lodash';

let embedlyTagIncluded = false;

export default {
    props: ['url', 'component', 'componentProps', 'isIframe', 'showPin'],
    data() {
        return {
            error: '',
            addedEventListener: false,
            debouncedUpdateEmbed: null,
        };
    },
    computed: {
        embedlyKey() {
            return this.$state.settings.embedly.key;
        },
        embedding() {
            return this.$state.setting('embedding');
        },
        iframeSandboxOptions() {
            // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
            // Mostly all permissions other than allow-top-navigation so that embedded content
            // cannot redirect the page away from kiwi
            let options = [
                'allow-downloads',
                'allow-forms',
                'allow-modals',
                'allow-orientation-lock',
                'allow-pointer-lock',
                'allow-popups',
                'allow-popups-to-escape-sandbox',
                'allow-presentation',
                'allow-same-origin',
                'allow-scripts',
            ];

            return options.join(' ');
        },
    },
    watch: {
        url() {
            this.debouncedUpdateEmbed();
        },
        isIframe() {
            this.debouncedUpdateEmbed();
        },
    },
    created() {
        // Debounce as both watchers may call it in the same tick
        // also causes the method to be called next tick to give dom time to update
        this.debouncedUpdateEmbed = _.debounce(() => {
            this.updateEmbed();
        }, 0);
    },
    mounted() {
        this.updateEmbed();
        this.$nextTick(() => {
            this.$state.$emit('mediaviewer.opened');
        });
    },
    beforeDestroy() {
        // Cleanup message event listener
        this.maybeAddOrRemoveEventListener(false);
    },
    methods: {
        updateEmbed() {
            if (!this.url || this.isIframe || this.component) {
                // This is not going to be handled by our embedding or embedly

                // Iframes do not automatically resize the mediaviewer
                // set a fixed height so the iframe content is visable
                // set auto for components as they can controll their own height
                this.$el.style.height = (this.isIframe) ? '40%' : 'auto';

                // Remove the event listener if its active as its nolonger needed
                this.maybeAddOrRemoveEventListener(false);
                return;
            }

            if (!this.embedlyKey) {
                const iframe = this.$refs.embedFrame;
                if (!iframe) {
                    // No iframe to work with so nothing to update
                    return;
                }

                let newUrl = this.embedding.url
                    .replace('{url}', encodeURIComponent(this.url))
                    .replace('{center}', !this.showPin)
                    .replace('{width}', this.embedding.maxWidth || 1000)
                    .replace('{height}', this.embedding.maxHeight || 400);

                // Set the iframe url
                iframe.src = newUrl;

                // Add message event listener if it does not exist
                this.maybeAddOrRemoveEventListener(true);
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
                    this.$el.style.height = 'auto';
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
                this.error = (data.error === 'not_supported') ?
                    this.$t('preview_not_supported') :
                    data.error;
            } else if (data.dimensions) {
                // Dimensions message contains updated dimensions for the iframe content
                const height = Math.min(data.dimensions.height, this.embedding.maxHeight || 400);
                iframe.height = height + 'px';

                // Now we have dimensions stop hiding the media viewer
                // This is to stop the message list jumping when opened with invalid url
                this.$el.style.height = 'auto';
            }
        },
        maybeAddOrRemoveEventListener(add) {
            if (add && !this.eventListener) {
                window.addEventListener('message', this.messageEventHandler);
                this.addedEventListener = true;
            } else if (!add && this.eventListener) {
                window.removeEventListener('message', this.messageEventHandler);
                this.addedEventListener = false;
            }
        },
    },
};
</script>

<style>
.kiwi-mediaviewer {
    box-sizing: border-box;
    position: relative;
    height: auto;
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

.kiwi-mediaviewer-error {
    display: inline-block;
    padding: 10px 15px;
    border-radius: 10px;
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
