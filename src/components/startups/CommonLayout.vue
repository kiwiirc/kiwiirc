<template>
    <div :class="[
        closing ? 'kiwi-startup-common--closing' : '',
        backgroundImage ? '' : 'kiwi-startup-common--no-bg',
    ]" :style="backgroundStyle" class="kiwi-startup-common">
        <div class="kiwi-startup-common-section kiwi-startup-common-section-connection">
            <slot name="connection"/>
        </div>
        <div
            :style="backgroundStyle"
            class="kiwi-startup-common-section kiwi-startup-common-section-info"
        >
            <div
                v-if="infoContent"
                class="kiwi-startup-common-section-info-content"
                v-html="infoContent"
            />
        </div>
    </div>
</template>

<script>
'kiwi public';

import state from '@/libs/state';

export default {
    data() {
        return {
            closing: false,
        };
    },
    computed: {
        backgroundStyle() {
            let style = {};
            let options = state.settings.startupOptions;

            if (options.infoBackground) {
                style['background-image'] = `url(${options.infoBackground})`;
            }
            return style;
        },
        backgroundImage() {
            return state.settings.startupOptions.infoBackground || '';
        },
        infoContent() {
            return state.settings.startupOptions.infoContent || '';
        },
    },
    methods: {
        close() {
            this.closing = true;
            let startApp = (event) => {
                this.$el.removeEventListener('transitionend', startApp);
                state.persistence.watchStateForChanges();
                // Hacky to be using $parent but this component should only be used in a sepcific
                // scope within startup screens
                this.$parent.$emit('start');
            };

            this.$el.addEventListener('transitionend', startApp, false);
        },
    },
};
</script>

<style>

.kiwi-startup-common {
    height: 100%;
    text-align: center;
    display: flex;
}

.kiwi-startup-common-section {
    padding: 1em;
    box-sizing: border-box;
    overflow-y: auto;
    min-height: 100%;
}

.kiwi-startup-common-section-connection {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40%;
    max-width: 500px;
}

/** Right side */
.kiwi-startup-common-section-info {
    color: #fff;
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
}

.kiwi-startup-common-section-info-content {
    background: rgba(255, 255, 255, 0.74);
    margin: 2em;
    color: #1b1b1b;
    font-size: 1.5em;
    padding: 2em;
    line-height: 1.6em;
}

@media (min-width: 850px) {
    /** Closing - the wiping away of the screen **/
    .kiwi-startup-common-section {
        transition: right 0.3s, left 0.3s;
    }

    .kiwi-startup-common--closing .kiwi-startup-common-section-connection {
        left: -50%;
    }

    .kiwi-startup-common--closing .kiwi-startup-common-section-info {
        right: -50%;
    }
}

/** Smaller screen... **/
@media (max-width: 850px) {
    .kiwi-startup-common {
        font-size: 0.9em;
        flex-direction: column;
        transition: left 0.3s;
        min-height: none;
        align-items: center;
        justify-content: center;
        padding-top: 2em;
    }

    .kiwi-startup-common-section {
        width: 100%;
        min-height: auto;
    }

    /** Closing - the wiping away of the screen **/
    .kiwi-startup-common--closing {
        left: -100%;
    }

    .kiwi-startup-common-section-connection > * {
        max-width: 450px;
    }
}

/** Background / border switching between screen sizes **/
/* stylelint-disable  no-duplicate-selectors */
.kiwi-startup-common {
    background-size: 0;
    background-position: bottom;
}

.kiwi-startup-common-section-info {
    background-size: cover;
    background-position: bottom;
    border-left: 5px solid #42b992;
}

.kiwi-startup-common--no-bg .kiwi-startup-common-section-info {
    background-color: rgb(51, 51, 51);
}

/* stylint-enable */

@media (max-width: 850px) {
    /* Apply some flex so that the info panel fills the rest of the bottom screen */
    .kiwi-startup-common {
        background-size: cover;
    }

    .kiwi-startup-common-section-info {
        background-size: 0;
        border-left: none;
        flex: 1 0;
        display: block;
    }

    .kiwi-startup-common--no-bg .kiwi-startup-common-section-info {
        border-top: 5px solid #42b992;
    }
}

@media (max-width: 500px) {
    .kiwi-startup-common-section-info-content {
        margin: 1em;
    }
}
</style>
