<template>
    <div class="kiwi-statebrowser kiwi-theme-bg">

        <div
            v-if="!$state.setting('hideSettings')"
            :title="$t('kiwi_settings')"
            class="kiwi-statebrowser-appsettings"
            @click="clickAppSettings"
        >
            <i class="fa fa-cog" aria-hidden="true" />
        </div>

        <state-browser-usermenu
            v-if="isPersistingState"
            :network="getNetwork"
        />

        <div class="kiwi-statebrowser-tools">
            <div
                v-for="plugin in pluginUiElements"
                :key="plugin.id"
                v-rawElement="{
                    el: plugin.el,
                    props: {
                        kiwi: {
                            statebrowser: self,
                        }
                    }
                }"
                class="kiwi-statebrowser-tool"
            />
        </div>

        <div class="kiwi-statebrowser-scrollarea">
            <div class="kiwi-statebrowser-networks">
                <state-browser-network
                    v-for="network in networksToShow"
                    :key="network.id"
                    :network="network"
                    :sidebar-state="sidebarState"
                    :active-prompt="activePrompt"
                />
            </div>
        </div>

        <div v-if="!isRestrictedServer" class="kiwi-statebrowser-newnetwork">
            <a class="u-button u-button-primary" @click="clickAddNetwork">
                {{ $t('add_network') }}
                <i class="fa fa-plus" aria-hidden="true" />
            </a>
        </div>
    </div>
</template>

<script>
'kiwi public';

import GlobalApi from '@/libs/GlobalApi';
import StateBrowserNetwork from './StateBrowserNetwork';
import StateBrowserUsermenu from './StateBrowserUsermenu';
import AppSettings from './AppSettings';
import BufferSettings from './BufferSettings';

export default {
    components: {
        BufferSettings,
        StateBrowserNetwork,
        StateBrowserUsermenu,
    },
    props: ['networks', 'sidebarState'],
    data() {
        return {
            self: this,
            pluginUiElements: GlobalApi.singleton().stateBrowserPlugins,
            activePrompt: {
                type: undefined,
                value: undefined,
            },
        };
    },
    computed: {
        getNetwork() {
            return this.$state.getActiveNetwork();
        },
        isPersistingState: function isPersistingState() {
            return !!this.$state.persistence;
        },
        isRestrictedServer: function isRestrictedServer() {
            return !!this.$state.settings.restricted;
        },
        networksToShow: function networksToShow() {
            return this.networks.filter((net) => !net.hidden);
        },
    },
    created() {
        this.listen(this.$state, 'document.clicked', (e) => {
            if (!this.activePrompt.type) {
                // Prompt is not open
                return;
            }

            // Clicking anywhere on the page that is not a prompt or close button
            // closes the active prompt
            const ignoreClasses = [
                '.kiwi-statebrowser-prompt-close',
                '.kiwi-statebrowser-queries-close',
                '.kiwi-statebrowser-channel-leave',
            ];
            const ignoreEls = this.$el.querySelectorAll(ignoreClasses.join(', '));

            // ignoreEls.forEach((ignoreEl) => {
            for (let i = 0; i < ignoreEls.length; i++) {
                if (ignoreEls[i].contains(e.target)) {
                    return;
                }
            }

            this.activePrompt.type = undefined;
            this.activePrompt.value = undefined;
        });
    },
    methods: {
        clickAddNetwork: function clickAddNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = this.$state.getNetworkFromAddress('');
            if (typeof network === 'undefined') {
                network = this.$state.addNetwork('Network', nick, {});
            }
            network.showServerBuffer('settings');
        },
        clickAppSettings: function clickAppSettings() {
            this.$state.$emit('active.component.toggle', AppSettings);
        },
        hideStatebrowser: function hideStatebrowser() {
            this.$state.$emit('statebrowser.hide');
        },
    },
};
</script>

<style lang="less">

.kiwi-statebrowser {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    border-right: none;
    text-align: center;
    overflow: hidden;
    transition: left 0.145s, margin-left 0.145s;
}

.kiwi-statebrowser h1 {
    width: 100%;
    font-size: 1em;
    opacity: 0.8;
    cursor: default;
    padding: 20px 0 27px 0;
}

.kiwi-statebrowser hr {
    width: 100%;
    margin: 0;
    opacity: 0.3;
}

/* User Settings */
.kiwi-statebrowser-appsettings {
    position: absolute;
    top: 0;
    left: 0;
    width: 32px;
    line-height: 32px;
    text-align: center;
    cursor: pointer;
    font-weight: 800;
    font-size: 20px;
    opacity: 0.8;
    border-bottom-right-radius: 14px;
    transition: background 0.2s, opacity 0.2s;
    z-index: 1;
}

/* Add network button */
.kiwi-statebrowser-newnetwork {
    width: 100%;
    position: static;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    border-top: 1px solid;
}

.kiwi-statebrowser-newnetwork a {
    width: 100%;
    padding: 0 10px;
    margin: 0;
    opacity: 1;
    line-height: 39px;
    cursor: pointer;
    display: block;
    box-sizing: border-box;
    background: none;
    text-align: left;
    position: relative;
    border-radius: 0;
    font-size: 0.9em;
    transition: all 0.3s;
    border: none;
}

.kiwi-statebrowser-newnetwork a i {
    position: absolute;
    right: 20px;
    line-height: 39px;
    font-size: 1.15em;
}

.kiwi-statebrowser-newnetwork a:hover {
    opacity: 1;
}

.kiwi-statebrowser-network .kiwi-statebrowser-network-header {
    line-height: 45px;
    text-align: left;
    position: relative;
    display: flex;
}

.kiwi-statebrowser-network .kiwi-statebrowser-network-header a {
    text-align: left;
    padding: 0 0 0 10px;
    font-size: 1em;
    font-weight: 600;
}

/* Channel Styling */
.kiwi-statebrowser-channel {
    line-height: 30px;
    padding: 0 0 0 8px;
    transition: opacity 0.3s;
}

.kiwi-statebrowser-channel .kiwi-statebrowser-channel-name {
    text-align: left;
    font-weight: 600;
    font-size: 1em;
}

.kiwi-statebrowser-channel-active {
    font-weight: 600;
    border-left: 3px solid;
    opacity: 1;
}

.kiwi-statebrowser-channel::before {
    line-height: 30px;
}

/* New Channel Button */
.kiwi-statebrowser-newchannel {
    padding: 0;
    height: auto;
    width: 100%;
    border-top: none;
    box-sizing: border-box;
}

.kiwi-statebrowser-newchannel a {
    width: 90%;
    padding: 0 10px 0 10px;
    line-height: 35px;
    font-size: 0.8em;
    font-weight: 500;
    cursor: pointer;
    display: block;
    box-sizing: border-box;
    background: none;
    text-align: left;
    position: relative;
    border-radius: 4px;
    margin: 0 5%;
    transition: all 0.3s;
}

.kiwi-statebrowser-newchannel a i {
    position: absolute;
    right: 10px;
    line-height: 35px;
    font-size: 1.2em;
}

.kiwi-statebrowser-newchannel a i:hover {
    opacity: 1;
}

.kiwi-statebrowser-usermenu .fa-caret-down {
    transition: all 0.3s;
}

.kiwi-statebrowser-usermenu--open .fa-caret-down {
    transform: rotate(-180deg);
}

.kiwi-statebrowser-switcher a {
    display: inline-block;
    width: 50%;
    padding: 5px 0;
    font-size: 1.2em;
    cursor: pointer;
    text-align: center;
}

.kiwi-statebrowser-usermenu-body a:hover {
    text-decoration: underline;
}

.kiwi-statebrowser-scrollarea {
    height: auto;
    margin-bottom: 0;
    box-sizing: border-box;
    overflow-y: auto;
    width: 100%;
    flex: 1;
}

.kiwi-statebrowser-network {
    margin-bottom: 2em;
    overflow: hidden;
}

.kiwi-statebrowser-network:last-child {
    margin-bottom: 0;
}

.kiwi-statebrowser-options {
    position: absolute;
    bottom: 0;
    padding: 15px;
    height: 30px;

    /* some space on the right so it doesnt overlap the parent elements scrollbar */
    margin-right: 10px;
}

.kiwi-statebrowser-newchannel-inputwrap {
    padding: 3px;
}

.kiwi-statebrowser-newchannel-inputwrap input {
    outline: none;
    border: none;
    display: block;
    width: calc(100% - 20px);
    margin-right: 30px;
}

.kiwi-statebrowser-newchannel-inputwrap i {
    position: absolute;
    right: 5px;
    top: 5px;
    cursor: pointer;
}

.kiwi-statebrowser-newchannel-inputwrap--focus {
    opacity: 1;
}

@media screen and (max-width: 769px) {
    .kiwi-statebrowser {
        left: -100%;
        padding-top: 0;
        z-index: 1000;
    }

    .kiwi-wrap.kiwi-wrap--statebrowser-drawopen .kiwi-statebrowser {
        width: 75%;
        left: 0;
        z-index: 100;
        transition: left 0.07s, width 0.1s;
    }

    .kiwi-header {
        text-align: center;
    }

    .kiwi-container-toggledraw-statebrowser-messagecount {
        width: 30px;
        color: #000;
        font-weight: 600;
        max-height: 49.5px;
    }

    //Resize the buttons within the statebrowser
    .kiwi-statebrowser-newchannel a {
        margin-right: 2.5%;
        margin-left: 2.5%;
        width: 95%;
    }

    .kiwi-statebrowser-channel::before {
        line-height: 40px;
    }

    .kiwi-statebrowser-usermenu {
        position: relative;
    }

    .kiwi-statebrowser-usermenu-body .kiwi-close-icon {
        display: none;
    }

    .kiwi-wrap--statebrowser-drawopen .kiwi-statebrowser::after {
        opacity: 1;
        width: 100%;
        right: -100%;
        transition: width 0.2s, opacity 0.2s;
    }
}

</style>
