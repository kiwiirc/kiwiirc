<template>
    <div
        class="kiwi-wrap"
        v-bind:class="{
            'kiwi-wrap--statebrowser-drawopen': stateBrowserDrawOpen,
            'kiwi-wrap--monospace': setting('useMonospace'),
            'kiwi-wrap--touch': state.ui.is_touch,
        }"
        @click="emitDocumentClick"
    >
        <link v-bind:href="themeUrl" rel="stylesheet" type="text/css">

        <template v-if="!hasStarted || (!fallbackComponent && networks.length === 0)">
            <component v-bind:is="startupComponent" v-on:start="startUp"></component>
        </template>
        <template v-else>
            <state-browser :networks="networks"></state-browser>
            <div class="kiwi-workspace" @click="stateBrowserDrawOpen = false">
                <div class="kiwi-workspace-background"></div>

                <template v-if="!activeComponent && network">
                    <container
                        :network="network"
                        :buffer="buffer"
                        :users="users"
                        :isHalfSize="mediaviewerOpen"
                    ></container>
                    <media-viewer
                        v-if="mediaviewerOpen"
                        :url="mediaviewerUrl"
                    ></media-viewer>
                    <control-input :container="networks" :buffer="buffer"></control-input>
                </template>
                <component v-else-if="!activeComponent" v-bind:is="fallbackComponent" v-bind="fallbackComponentProps"></component>
                <component v-else v-bind:is="activeComponent" v-bind="activeComponentProps"></component>
            </div>
        </template>
        <template v-else>
            <component v-bind:is="startupComponent" v-on:start="startUp"></component>
        </template>
    </div>
</template>

<script>

import 'font-awesome-webpack';
import '../res/globalStyle.css';

import startupWelcome from '@/components/startups/Welcome';
import startupZncLogin from '@/components/startups/ZncLogin';
import startupCustomServer from '@/components/startups/CustomServer';
import startupKiwiBnc from '@/components/startups/KiwiBnc';
import startupPersonal from '@/components/startups/Personal';
import StateBrowser from '@/components/StateBrowser';
import Container from '@/components/Container';
import ControlInput from '@/components/ControlInput';
import MediaViewer from '@/components/MediaViewer';
import * as Notifications from '@/libs/Notifications';
import * as AudioBleep from '@/libs/AudioBleep';
import ThemeManager from '@/libs/ThemeManager';
import Logger from '@/libs/Logger';
import state from '@/libs/state';
import InputHandler from '@/libs/InputHandler';

let log = Logger.namespace('App.vue');

/* eslint-disable no-new */
new InputHandler(state);

export default {
    created: function created() {
        this.listen(state, 'active.component', (component, props) => {
            this.activeComponent = null;
            if (component) {
                this.activeComponentProps = props;
                this.activeComponent = component;
            }
        });
        this.listen(state, 'network.settings', (network) => {
            this.activeComponent = null;
            state.setActiveBuffer(network.id, network.serverBuffer().name);
        });
        this.listen(state, 'statebrowser.toggle', () => {
            this.stateBrowserDrawOpen = !this.stateBrowserDrawOpen;
        });
        this.listen(state, 'statebrowser.show', () => {
            this.stateBrowserDrawOpen = true;
        });
        this.listen(state, 'statebrowser.hide', () => {
            this.stateBrowserDrawOpen = false;
        });
        this.listen(state, 'mediaviewer.show', (url) => {
            this.mediaviewerUrl = url;
            this.mediaviewerOpen = true;
        });
        this.listen(state, 'mediaviewer.hide', () => {
            this.mediaviewerOpen = false;
        });

        let themes = ThemeManager.instance();
        this.themeUrl = themes.themeUrl(themes.currentTheme());
        this.listen(state, 'theme.change', () => {
            this.themeUrl = themes.themeUrl(themes.currentTheme());
        });

        document.addEventListener('keydown', event => this.emitDocumentKeyDown(event), false);
        window.addEventListener('focus', event => {
            state.ui.app_has_focus = true;
            let buffer = state.getActiveBuffer();
            if (buffer) {
                buffer.markAsRead(true);
            }
        }, false);
        window.addEventListener('blur', event => {
            state.ui.app_has_focus = false;
        }, false);
        window.addEventListener('touchstart', event => {
            // Parts of the UI adjust themselves if we're known to be using a touchscreen
            state.ui.is_touch = true;
        });
    },
    mounted: function mounted() {
        // Decide which startup screen to use depending on the config
        let startupScreens = {
            welcome: startupWelcome,
            customServer: startupCustomServer,
            kiwiBnc: startupKiwiBnc,
            znc: startupZncLogin,
            personal: startupPersonal,
        };
        let extraStartupScreens = state.getStartups();

        let startupName = state.settings.startupScreen || 'personal';
        let startup = extraStartupScreens[startupName] || startupScreens[startupName];

        if (!startup) {
            Logger.error(`Startup screen "${startupName}" does not exist`);
        } else {
            this.startupComponent = startup;
        }
    },
    components: {
        StateBrowser,
        Container,
        ControlInput,
        MediaViewer,
    },
    data: function data() {
        return {
            startupComponent: null,
            hasStarted: false,
            // When on mobile screens, the statebrowser turns into a drawer
            stateBrowserDrawOpen: false,
            // If set, will become the main view instead of a buffer/nicklist container
            activeComponent: null,
            activeComponentProps: {},
            // If set, will become the main view when no networks are available to be shown
            // and there is no active component set
            fallbackComponent: null,
            fallbackComponentProps: {},
            mediaviewerOpen: false,
            mediaviewerUrl: '',
            themeUrl: '',
        };
    },
    computed: {
        state() {
            return state;
        },
        networks() {
            return state.networks;
        },
        network() {
            return state.getActiveNetwork();
        },
        buffer() {
            return state.getActiveBuffer();
        },
        users() {
            let activeNetwork = this.network;
            if (!activeNetwork) {
                return null;
            }

            return activeNetwork.users;
        },
    },
    methods: {
        // Triggered by a startup screen event
        startUp: function startUp(opts) {
            log('startUp()');
            if (opts && opts.fallbackComponent) {
                this.fallbackComponent = opts.fallbackComponent;
            }
            if (opts && opts.fallbackComponentProps) {
                this.fallbackComponentProps = opts.fallbackComponentProps;
            }

            // Make sure a startup screen can't trigger these more than once
            if (!this.hasStarted) {
                this.warnOnPageClose();
                Notifications.requestPermission();
                Notifications.listenForNewMessages(state);
                AudioBleep.listenForHighlights(state);
            }

            this.hasStarted = true;
        },
        warnOnPageClose() {
            window.onbeforeunload = () => this.$t('window_unload');
        },
        emitDocumentClick: function emitDocumentClick(event) {
            state.$emit('document.clicked', event);
        },
        emitDocumentKeyDown: function emitDocumentKeyDown(event) {
            state.$emit('document.keydown', event);
        },
        setting: function setting(name) {
            return state.setting(name);
        },
    },
};

</script>

<style>
html {
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    height: 100%;
    margin: 0;
    padding: 0;
}



.kiwi-wrap {
    font-size: 90%;
    line-height: 1.6em;
    font-family: Source Sans Pro, Helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    height: 100%;
    overflow: hidden;
    --kiwi-nick-brightness: 50;
    --kiwi-supports-monospace: 1;
}

.kiwi-wrap--monospace {
    font-family: Consolas, monaco, monospace;
    font-size: 80%;
}

.kiwi-statebrowser {
    position: absolute;
    top: 0;
    left: 0;
    width: 200px;
    bottom: 0;
    transition: left 0.5s;
    z-index: 1;
}
/* Small screen will cause the statebrowser to act as a drawer */
@media screen and (max-width: 600px) {
    .kiwi-statebrowser {
        left: -200px;
    }
    .kiwi-wrap--statebrowser-drawopen .kiwi-statebrowser {
        left: 0;
    }
}
.kiwi-workspace {
    position: relative;
    margin-left: 200px;
    left: 0;
    display: block;
    height: 100%;
    transition: left 0.5s, margin-left 0.5s;
}
.kiwi-workspace:before {
    position: absolute;
    content: '';
    height: 4px;
    right: 0;
    left: 0;
    top: 0;
}
/* When the statebrowser opens as a draw, darken the workspace */
.kiwi-workspace:after {
    position: fixed;
    top: 0;
    right: 0;
    content: '';
    background-color: rgba(0,0,0,.4);
    overflow: hidden;
    opacity: 0;
    transition: opacity .5s;
    will-change: opacity;
}
.kiwi-workspace-background {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: -1;
}
/* Small screen will cause the statebrowser to act as a drawer */
@media screen and (max-width: 600px) {
    .kiwi-workspace {
        left: 0;
        margin-left: 0;
    }
    .kiwi-wrap--statebrowser-drawopen .kiwi-workspace {
        left: 200px;
        margin-left: 0;
    }
    .kiwi-wrap--statebrowser-drawopen .kiwi-workspace:after {
        width: 100%;
        height: 100%;
        opacity: 1;
        z-index: 10;
    }
}
.kiwi-container {
    position: absolute;
    top: 0;
    bottom: 40px;
    width: 100%;
}
.kiwi-container--mini {
    bottom: 50%;
}
.kiwi-mediaviewer {
    position: absolute;
    top: 50%;
    bottom: 40px;
    width: 100%;
}
.kiwi-controlinput {
    position: absolute;
    bottom: 0;
    height: 40px;
    width: 100%;
    z-index: 2;
}
</style>
