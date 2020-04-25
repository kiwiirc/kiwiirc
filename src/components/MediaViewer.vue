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
        };
    },
    computed: {
        embedlyKey() {
            return this.$state.settings.embedly.key;
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
    created() {
        this.updateEmbed();
    },
    mounted() {
        this.$nextTick(() => {
            this.$state.$emit('mediaviewer.opened');
        });
    },
    methods: {
        updateEmbed() {
            if (!this.url || this.isIframe || this.component) {
                // return if embedly script is not needed
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
