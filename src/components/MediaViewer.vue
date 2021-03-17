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
        <div class="kiwi-mediaviewer-content">
            <iframe
                v-if="isIframe"
                :src="url"
                :sandbox="iframeSandboxOptions"
                class="kiwi-mediaviewer-iframe"
            />
            <component :is="component" v-else-if="component" :component-props="componentProps" />
            <url-embed
                v-else
                :url="url"
                :show-pin="showPin"
                :iframe-sandbox-options="iframeSandboxOptions"
                @close="$emit('close')"
                @setHeight="setHeight"
                @setMaxHeight="setMaxHeight"
            />
        </div>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import UrlEmbed from './UrlEmbed.vue';

export default {
    components: {
        UrlEmbed,
    },
    props: ['url', 'component', 'componentProps', 'isIframe', 'showPin'],
    data() {
        return {
            debouncedUpdateEmbed: null,
        };
    },
    computed: {
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
    methods: {
        updateEmbed() {
            this.setMaxHeight('');
            if (this.url && !this.isIframe) {
                return;
            }
            this.setHeight((this.isIframe) ? '40%' : 'auto');
        },
        setHeight(newHeight) {
            this.$el.style.height = newHeight;
        },
        setMaxHeight(newHeight) {
            this.$el.style.maxHeight = newHeight;
        },
    },
};
</script>

<style>

.kiwi-mediaviewer {
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    height: 0;
}

.kiwi-mediaviewer-controls {
    position: absolute;
    top: 0;
    right: 16px;
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

.kiwi-mediaviewer-content {
    height: 100%;
    overflow: auto;
}

.kiwi-mediaviewer-iframe {
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    border: none;
}

</style>
