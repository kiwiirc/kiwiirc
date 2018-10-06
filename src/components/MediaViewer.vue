<template>
    <div
        ref="VueDraggableResizableContainer"
        class="kiwi-viewer-container"
    >
        <VueDraggableResizable
            :draggable="viewerPopped"
            :resizable="viewerPopped"
            :set-width="VueDraggableResizableWidth"
            :set-height="VueDraggableResizableHeight"
            :set-top="VueDraggableResizableTop"
            :set-left="VueDraggableResizableLeft"
            :handles="['br']"
            :class="{'kiwi-mediaviewer-poppedin': !viewerPopped}"
            style="border: 2px solid #3334; border-radius: 2px;"
        >
            <div
                ref="windowHandle"
                class="kiwi-mediaviewer-controls"
                @mousedown="setDepth()"
            >
                <button
                    v-if="!viewerEmbedded || !viewerPopped"
                    :title="popButtonToolTip"
                    class="kiwi-pop-button"
                    @click="popViewer()"
                >
                    {{ mediaviewerButtonText }}
                </button>
                <div
                    v-if="!viewerEmbedded || !viewerPopped"
                    style="width: 40px; float:left; height: 40px;"
                />
                <a
                    :href="getRootDomain.URL"
                    class="kiwi-viewer-header-link"
                    target="_blank"
                    rel="nofollow"
                >
                    {{ getRootDomain.domain }}
                </a>
                <a
                    class="u-button u-button-warning kiwi-mediaviewer-controls-close"
                    style="float: right;"
                    @click="closeViewer"
                >
                    <i class="fa fa-window-close" aria-hidden="true"/>
                </a>
            </div>
            <div
                style="width:100%; text-align: center; background: #eee; height: 30px;"
            />

            <div ref="kiwiMediaViewer" class="kiwi-mediaviewer" @mousedown="setDepth()">
                <div :key="url">
                    <iframe
                        v-if="isIframe"
                        :src="url"
                        class="kiwi-mediaviewer-iframe"
                    />
                    <component v-else-if="component" :is="component"/>
                    <a
                        v-else
                        :href="url"
                        :data-card-key="embedlyKey"
                        class="embedly-card"
                        data-card-chrome="0"
                        data-card-controls="0"
                        data-card-recommend="0"
                    >{{ $t('media_loading', {url: url}) }}</a>
                </div>
            </div>
        </VueDraggableResizable>
    </div>
</template>

<script>
'kiwi public';

import state from '@/libs/state';
import VueDraggableResizable from 'vue-draggable-resizable';

let embedlyTagIncluded = false;

export default {
    components: {
        VueDraggableResizable,
    },
    props: ['url', 'component', 'isIframe', 'id', 'viewerEmbedded', 'mediaviewers', 'viewerdragging'],
    data: function data() {
        return {
            mediaviewerButtonText: '◢',
            viewerPopped: false,
            VueDraggableResizableWidth: 0,
            VueDraggableResizableHeight: 0,
            VueDraggableResizableTop: 0,
            VueDraggableResizableLeft: 0,
            popButtonToolTip: 'Pop Out',
        };
    },
    computed: {
        embedlyKey: function embedlyKey() {
            return state.settings.embedly.key;
        },
        getRootDomain() {
            let a = document.createElement('a');
            a.href = this.url;
            return {
                domain: a.hostname,
                URL: this.url.split('//')[0] + '//' + a.hostname,
            };
        },
    },
    watch: {
        url: function watchUrl() {
            this.updateEmbed();
        },
        isIframe: function watchUrl() {
            this.updateEmbed();
        },
        viewerdragging(val) {
            if (val) {
                this.$refs.kiwiMediaViewer.style.pointerEvents = 'none';
            } else {
                this.$refs.kiwiMediaViewer.style.pointerEvents = 'auto';
            }
        },
    },
    created: function created() {
        this.updateEmbed();
    },
    mounted: function mounted() {
        this.$nextTick(() => {
            state.$emit('mediaviewer.opened');
        });
        // set initial viewer size/position
        this.resetPop();
    },
    methods: {
        setDepth() {
            this.$emit('viewermousedown', this.id);
        },
        updateEmbed: function updateEmbed() {
            let checkEmbedlyAndShowCard = () => {
                if (!this.isIframe) {
                    return;
                }

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
        closeViewer() {
            this.$emit('closeviewer', this.id);
        },
        popViewer() {
            this.viewerPopped = !this.viewerPopped;
            this.$emit('viewerpopped', this.id);
            this.mediaviewerButtonText = this.viewerPopped ? '◤' : '◢';
            this.popButtonToolTip = this.viewerPopped ? 'Pop In' : 'Pop Out';
            if (this.viewerPopped) {
                this.popViewerOut();
            } else {
                this.popViewerIn();
            }
        },
        popViewerIn() {
            this.VueDraggableResizableWidth =
            this.$refs.VueDraggableResizableContainer.parentNode.clientWidth;
            this.VueDraggableResizableHeight =
            this.$refs.VueDraggableResizableContainer.parentNode.clientHeight * 0.4;
            this.VueDraggableResizableTop = 0;
            this.VueDraggableResizableLeft = 0;
        },
        popViewerOut() {
            this.$nextTick(() => {
                this.$refs.windowHandle.onmousedown = () => {
                    this.$emit('viewerdragging', 1);
                };
                this.$refs.windowHandle.onmouseup = () => {
                    this.$emit('viewerdragging', 0);
                };
            });
            this.VueDraggableResizableWidth = 600;
            this.VueDraggableResizableHeight = 400;
            this.VueDraggableResizableTop = 200;
            this.VueDraggableResizableLeft = 300;
        },
        resetPop() {
            // popping the viewer in then out refreshes the
            // watched props in vue-draggable-resizable
            // this is needed for setting initial position.
            this.$nextTick(() => {
                this.popViewer();
                this.$nextTick(() => this.popViewer());
            });
        },
    },
};
</script>

<style>
.kiwi-mediaviewer {
    position: relative;
    height: calc(100% - 35px);
    padding: 2px;
}

.kiwi-mediaviewer-controls {
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    z-index: 1;
    cursor: pointer;
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

.kiwi-mediaviewer-poppedin {
    margin-top: 50px;
}

.kiwi-pop-button {
    position: absolute;
    background: #eee;
    border: none;
    font-size: 1.75em;
    color: #001;
    padding: 0;
    height: 30px;
    padding-left: 4px;
    padding-right: 4px;
    cursor: pointer;
}

.kiwi-viewer-container {
    position: absolute;
    width: 0;
    height: 0;
}

.kiwi-viewer-header-link {
    float: left;
    font-size: 1.1em;
    color: #efe;
    margin: 3px;
    padding: 4px;
    padding-left: 6px;
    padding-right: 6px;
    border-radius: 3px;
    text-decoration: none;
    margin-left: 2px;
    background: #99a;
    line-height: 0.98em;
}
</style>
