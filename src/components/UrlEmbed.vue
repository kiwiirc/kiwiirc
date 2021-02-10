<template>
    <div
        :key="url"
        class="kiwi-mediaviewer-embedly"
    >
        <a
            ref="embedlyLink"
            :href="url"
            :data-card-key="settings.key"
            class="kiwi-embedly-card"
            data-card-chrome="0"
            data-card-controls="0"
            data-card-recommend="0"
        >{{ $t('media_loading', {url: url}) }}</a>
    </div>
</template>

<script>
'kiwi public';

let embedlyTagIncluded = false;

export default {
    props: ['url', 'showPin', 'iframeSandboxOptions'],
    data() {
        return {
            debouncedUpdateEmbed: null,
        };
    },
    computed: {
        settings() {
            return this.$state.setting('embedly');
        },
    },
    watch: {
        url() {
            this.updateEmbed();
        },
    },
    created() {
        this.updateEmbed();
    },
    methods: {
        updateEmbed() {
            let checkEmbedlyAndShowCard = () => {
                // If the embedly function doesn't exist it's probably still loading
                // the embedly script
                if (typeof window.embedly !== 'function') {
                    setTimeout(checkEmbedlyAndShowCard, 100);
                    return;
                }
                this.$nextTick(() => {
                    window.embedly('card', this.$refs.embedlyLink);
                    this.$emit('setHeight', 'auto');

                    if (this.showPin) {
                        // This is inline so set a max height
                        this.$el.style.maxHeight = (this.settings.maxHeight || 400) + 'px';
                    } else {
                        // This is main media view set a relative max height
                        this.$emit('setMaxHeight', '54%');
                    }
                });
            };

            if (!embedlyTagIncluded) {
                let head = document.getElementsByTagName('head')[0];
                let script = document.createElement('script');
                script.type = 'text/javascript';
                let embedlyUrl = this.$state.getSetting('settings.embedly.script') ||
                    '//cdn.embedly.com/widgets/platform.js';
                script.src = embedlyUrl;
                head.appendChild(script);
                embedlyTagIncluded = true;
            }
            checkEmbedlyAndShowCard();
        },
    },
};

</script>

<style>

    .embedly-card {
        display: block;
        margin: 4px 0;
    }

    .embedly-card-hug {
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 5px;
        background: #fff;
    }

    .kiwi-mediaviewer-embedly {
        display: inline-block;
        overflow: auto;
    }

    .kiwi-main-mediaviewer .kiwi-mediaviewer-embedly {
        display: block;
    }

</style>
