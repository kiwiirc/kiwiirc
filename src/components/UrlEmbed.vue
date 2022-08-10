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
            embedlyObject: null,
            waitTimer: 0,
            waitCount: 0,
        };
    },
    computed: {
        settings() {
            return this.$state.setting('embedly');
        },
    },
    watch: {
        url() {
            this.cleanEmbed();
            this.updateEmbed();
        },
    },
    created() {
        this.updateEmbed();
    },
    beforeDestroy() {
        this.cleanEmbed();
    },
    methods: {
        updateEmbed() {
            let checkEmbedlyAndShowCard = () => {
                // If the embedly function doesn't exist it's probably still loading
                // the embedly script
                if (typeof window.embedly !== 'function') {
                    if (this.waitTimer) {
                        // maybe the url changed and there already is a timer
                        clearTimeout(this.waitTimer);
                        this.waitTimer = 0;
                    }
                    if (this.waitCount < 300) {
                        // max wait 30 seconds (30000ms)
                        this.waitCount++;
                        this.waitTimer = setTimeout(checkEmbedlyAndShowCard, 100);
                    }
                    return;
                }

                this.$nextTick(() => {
                    this.embedlyObject = window.embedly('card', this.$refs.embedlyLink);
                    if (!this.embedlyObject) {
                        // embedly refused to create a card (maybe unsupported url)
                        if (this.showPin) {
                            // showPin is true when its an inline embed
                            this.$emit('close');
                        }

                        return;
                    }

                    this.embedlyObject.on('card.error', (iframe) => {
                        // not sure this event will be triggered
                        if (this.showPin) {
                            // showPin is true when its an inline embed
                            this.$emit('close');
                        }
                    });

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
                const head = document.getElementsByTagName('head')[0];
                const script = document.createElement('script');
                script.type = 'text/javascript';
                const embedlyUrl = this.$state.getSetting('settings.embedly.script') ||
                    '//cdn.embedly.com/widgets/platform.js';
                script.src = embedlyUrl;
                head.appendChild(script);
                embedlyTagIncluded = true;
            }
            checkEmbedlyAndShowCard();
        },
        cleanEmbed() {
            if (this.waitTimer) {
                clearTimeout(this.waitTimer);
                this.waitTimer = 0;
            }
            if (this.embedlyObject) {
                this.embedlyObject.remove();
                this.embedlyObject = null;
            }
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
