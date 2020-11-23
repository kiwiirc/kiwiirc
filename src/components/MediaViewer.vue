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
        <iframe
            v-if="isIframe"
            :src="url"
            class="kiwi-mediaviewer-iframe"
        />
        <component :is="component" v-else-if="component" :component-props="componentProps" />
        <div v-else-if="embedProvider" :key="url" class="kiwi-mediaviewer-noembed">
            <iframe
                ref="embedFrame"
                frameborder="0"
                height="40px"
                width="100%"
            />
        </div>
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
const isImage = /\.(png|jpg|gif)$/;
const urlCache = Object.create(null);
const maxHeight = 400;

export default {
    props: ['url', 'component', 'componentProps', 'isIframe', 'showPin'],
    data() {
        return {
            observer: null,
        };
    },
    computed: {
        embedlyKey() {
            return this.$state.settings.embedly.key;
        },
        embedProvider() {
            return this.$state.setting('embedProvider');
        },
    },
    watch: {
        url() {
            this.$nextTick(() => {
                this.updateEmbed();
            });
        },
    },
    mounted() {
        this.$nextTick(() => {
            this.$state.$emit('mediaviewer.opened');
        });

        this.updateEmbed();
    },
    beforeDestroy() {
        // Clean up the mutation observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    },
    methods: {
        updateEmbed() {
            // Clear out any existing observers
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }

            if (!this.url || this.isIframe || this.component) {
                // Nothing to update
                return;
            }

            if (this.embedProvider) {
                // Clear existing iframe data
                const iframeDoc = this.getIframeDocument();
                iframeDoc.head.innerHTML = '';
                iframeDoc.body.innerHTML = '';

                if (isImage.test(this.url)) {
                    this.updateImage();
                } else {
                    this.updateNoembed();
                }
            } else {
                // Fallback to embedly
                this.updateEmbedly();
            }
        },
        updateImage() {
            // The url appears to be an image create it an element and add it to the iframe
            const img = document.createElement('img');
            img.id = 'kiwi-embed-content';
            img.src = this.url;
            img.style.display = 'none';
            img.style.maxHeight = maxHeight + 'px';
            img.onload = () => {
                img.style.display = 'block';
                this.resizeIframe();
            };
            img.onerror = () => {
                this.$emit('close');
            };
            const iframeDoc = this.getIframeDocument();
            iframeDoc.body.appendChild(img);
        },
        async updateNoembed() {
            if (urlCache[this.url]) {
                // Cache hit
                if (urlCache[this.url].html) {
                    // Has embed content
                    this.setIframeHtml(urlCache[this.url].html);
                } else {
                    this.$emit('close');
                }
                return;
            }

            // Url was not in the cache, attempt to fetch it
            let embedUrl = this.embedProvider.replace('{url}', this.url);
            try {
                const resp = await fetch(embedUrl);
                const json = await resp.json();
                urlCache[this.url] = {
                    html: json.html,
                    time: Date.now(),
                };
                if (urlCache[this.url].html) {
                    // Has embed content
                    this.setIframeHtml(urlCache[this.url].html);
                } else {
                    this.$emit('close');
                }
            } catch (err) {
                this.$emit('close');
            }
        },
        updateEmbedly() {
            let checkEmbedlyAndShowCard = () => {
                // If the embedly function doesn't exist it's probably still loading
                // the embedly script
                if (typeof window.embedly !== 'function') {
                    setTimeout(checkEmbedlyAndShowCard, 100);
                    return;
                }
                this.$nextTick(() => {
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
        setIframeHtml(html) {
            const iframeDoc = this.getIframeDocument();
            const debouncedObserver = _.debounce(this.resizeIframe, 50);
            const observerOptions = {
                childList: true,
                subtree: true,
            };
            // Create mutation observer so we can resize the iframe as things change
            this.observer = new MutationObserver(debouncedObserver);
            this.observer.observe(iframeDoc.body, observerOptions);
            const div = document.createElement('div');
            div.id = 'kiwi-embed-content';
            // These styles will allow a scrollbar to appear if the content exceeds maxHeight
            div.style.height = '100%';
            div.style.overflow = 'auto';
            div.style.boxSizing = 'border-box';
            div.style.display = 'inline-block';
            // Add the embed html into the div
            div.innerHTML = html;
            iframeDoc.body.appendChild(div);
            // Scripts will not execute in the body so move them to the iframes head
            iframeDoc.body.querySelectorAll('script').forEach((limitedSrc) => {
                limitedSrc.parentElement.removeChild(limitedSrc);
                let script = document.createElement('script');
                // Itterate attributes and copy them to the new script element
                [...limitedSrc.attributes].forEach((attr) => {
                    script.setAttribute(attr.nodeName, attr.nodeValue);
                });
                iframeDoc.head.appendChild(script);
            });
        },
        resizeIframe() {
            // nextTick is used to ensure the observed changes have been applied
            this.$nextTick(() => {
                const iframe = this.$refs.embedFrame;
                if (!iframe) {
                    return;
                }
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const contentContainer = iframeDoc.querySelector('#kiwi-embed-content');
                if (!contentContainer) {
                    return;
                }
                const height = Math.min(contentContainer.scrollHeight, maxHeight);
                iframe.height = height + 'px';
            });
        },
        getIframeDocument() {
            const iframe = this.$refs.embedFrame;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.body.style.padding = 0;
            iframeDoc.body.style.margin = 0;
            if (!this.showPin) {
                // MediaViewer is not inline so center content
                iframeDoc.body.style.display = 'flex';
                iframeDoc.body.style.justifyContent = 'center';
            }
            return iframeDoc;
        },
    },
};
</script>

<style>
.kiwi-mediaviewer {
    box-sizing: border-box;
    position: relative;
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
    height: 400px;
    width: 100%;
    border: none;
}

.kiwi-container > .kiwi-mediaviewer > .kiwi-mediaviewer-noembed {
    text-align: center;
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
