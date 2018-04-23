<template>
    <div class="kiwi-startup-common" :class="[
        closing ? 'kiwi-startup-common--closing' : '',
        backgroundImage ? '' : 'kiwi-startup-common--no-bg',
    ]" :style="backgroundStyle">
        <div class="kiwi-startup-common-section kiwi-startup-common-section-connection">
            <slot name="connection"></slot>
        </div>
        <div class="kiwi-startup-common-section kiwi-startup-common-section-info" :style="backgroundStyle">
            <div class="kiwi-startup-common-section-info-content" v-if="infoContent" v-html="infoContent"></div>
        </div>
    </div>
</template>

<script>

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
}

.kiwi-startup-common-section {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 25%;
    padding: 1em;
    box-sizing: border-box;
    overflow-y: auto;
}

.kiwi-startup-common-section-connection {
    left: 0;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

/** Right side */
.kiwi-startup-common-section-info {
    right: 0;
    color: #fff;
    display: flex;
    width: 75%;
    align-items: center;
    justify-content: center;
    min-height: 100%;
}

.kiwi-startup-common-section-info-content {
    background: rgba(255, 255, 255, 0.74);
    margin: 2em;
    color: #1b1b1b;
    font-size: 1.5em;
    padding: 2em;
    line-height: 1.6em;
}

@media (max-width: 1325px) {
    .kiwi-startup-common-section {
        width: 40%;
    }

    .kiwi-startup-common-section-info {
        width: 60%;
    }
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
        position: relative;
        min-height: 100%;
        transition: left 0.3s;
        left: 0;
    }

    .kiwi-startup-common-section-connection {
        min-height: 400px;
        width: 100%;
        position: static;
    }

    .kiwi-startup-common-section-info {
        min-height: 0;
        width: 100%;
        position: static;
    }

    .kiwi-startup-common-section-info-content {
        margin: 1em;
    }

    /** Closing - the wiping away of the screen **/
    .kiwi-startup-common--closing {
        left: -100%;
    }
}

/** Even smaller screen.. probably phones **/
@media (max-width: 750px) {
    .kiwi-startup-common {
        font-size: 0.9em;
        overflow-y: auto;
    }

    .kiwi-startup-common-section-info-content {
        margin: 0.5em;
    }
}

/** Background /border switching between screen sizes **/
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
        display: flex;
        flex-direction: column;
    }

    .kiwi-startup-common-section {
        overflow-y: visible;
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

</style>
