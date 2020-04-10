<template>
    <div :class="{
        /* 'kiwi-container-' + bufferType: true, */
        'kiwi-container--sidebar-drawn': sidebarState.isDrawn,
        'kiwi-container--sidebar-open': sidebarState.isOpen,
        'kiwi-container--no-sidebar': buffer && !buffer.isChannel,
    }" class="kiwi-container"
    >
        <template v-if="buffer">
            <div class="kiwi-container-toggledraw-statebrowser" @click.stop="toggleStateBrowser">
                <div
                    :class="[
                        unreadMessages.highlight ?
                            'kiwi-container-toggledraw-statebrowser-messagecount--highlight' :
                            '',
                    ]"
                    class="kiwi-container-toggledraw-statebrowser-messagecount"
                >
                    <span class="kiwi-container-statebrowser-messagecount-alert">
                        {{ unreadMessages.count > 999 ? '999+' : unreadMessages.count }}
                    </span>
                    <span class="kiwi-container-statebrowser-messagecount-close">
                        <i class="fa fa-times" aria-hidden="true" />
                    </span>
                </div>
            </div>
            <container-header :buffer="buffer" :sidebar-state="sidebarState" />

            <slot name="before" />

            <not-connected
                v-if="buffer.getNetwork().state !== 'connected' && !buffer.isServer()"
                :buffer="buffer"
                :network="buffer.getNetwork()"
            />

            <div class="kiwi-container-content">
                <template v-if="buffer.isServer()">
                    <server-view :network="network" />
                </template>
                <template v-else>
                    <message-list :buffer="buffer" />
                    <sidebar
                        v-if="buffer.isChannel() /* There are no sidebars for queries yet */"
                        :network="network"
                        :buffer="buffer"
                        :sidebar-state="sidebarState"
                    />
                </template>

                <slot name="after" />
            </div>
        </template>
        <template v-else>
            <div class="kiwi-container-empty">
                <h4>{{ $t('container_welcome') }}</h4>
                <a class="u-button" @click.stop="toggleStateBrowser">
                    {{ $t('container_statebrowser') }}
                </a>
            </div>
        </template>
    </div>
</template>

<script>
'kiwi public';

import state from '@/libs/state';
import ContainerHeader from './ContainerHeader';
import Sidebar from './Sidebar';
import NotConnected from './NotConnected';
import MessageList from './MessageList';
import ServerView from './ServerView';

export default {
    components: {
        ContainerHeader,
        Sidebar,
        NotConnected,
        MessageList,
        ServerView,
    },
    props: ['network', 'buffer', 'sidebarState'],
    data: function data() {
        return {
        };
    },
    computed: {
        bufferType: function bufferType() {
            let type = '';

            if (!this.buffer) {
                type = 'none';
            } else if (this.buffer.isServer()) {
                type = 'server';
            } else if (this.buffer.isChannel()) {
                type = 'channel';
            } else if (this.buffer.isQuery()) {
                type = 'query';
            }
            return type;
        },
        unreadMessages() {
            let count = 0;
            let highlight = false;
            state.networks.forEach((network) => {
                network.buffers.forEach((buffer) => {
                    count += (buffer.flags.unread || 0);
                    if (buffer.flags.highlight) {
                        highlight = true;
                    }
                });
            });
            return { count, highlight };
        },
    },
    created: function created() {
        this.listen(state, 'sidebar.toggle', () => {
            state.$emit('sidebar.' + (this.sidebarState.isDrawn ? 'hide' : 'show'));
        });
        this.listen(state, 'sidebar.show', () => {
            this.sidebarState.showNicklist();
        });
        this.listen(state, 'sidebar.hide', () => {
            this.sidebarState.close();
        });
        this.listen(state, 'userbox.show', (user, opts) => {
            this.sidebarState.showUser(user);
        });
        this.listen(state, 'userbox.hide', () => {
            this.sidebarState.close();
        });
        this.listen(state, 'document.keydown', (ev) => {
            // Return if not Page Up or Page Down keys
            if (ev.keyCode !== 33 && ev.keyCode !== 34) {
                return;
            }

            // if no messagelist, select the first tabbed content to allow channel list scrolling
            let messageList = this.$el.querySelector('.kiwi-messagelist') ||
                this.$el.querySelector('.u-tabbed-content');

            if (!messageList) {
                return;
            }

            let scrollDistance = messageList.clientHeight - (0.1 * messageList.clientHeight);
            let scrollTop = messageList.scrollTop;
            let scrollMax = messageList.scrollHeight;

            if (ev.keyCode === 33) {
                // up
                scrollTop -= scrollDistance;
                if (scrollTop < 0) {
                    scrollTop = 0;
                }
            } else {
                // down
                scrollTop += scrollDistance;
                if (scrollTop > scrollMax) {
                    scrollTop = scrollMax;
                }
            }

            messageList.scrollTop = scrollTop;
        });
    },
    methods: {
        toggleStateBrowser: function toggleStateBrowser() {
            state.$emit('statebrowser.toggle');
        },
        toggleSidebar: function toggleSidebar() {
            if (this.buffer.isChannel()) {
                state.$emit('sidebar.toggle');
            }
        },
    },
};
</script>

<style>
.kiwi-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

/* When the sidebar is open we will put a shadow over the text area */
.kiwi-header {
    z-index: 2;

    /* IE 11 breaks when using the shorthand flex syntax here */
    flex-grow: 0;
    flex-shrink: 1;
}

.kiwi-sidebar {
    position: absolute;
    right: -443px;
    top: 45px; /* Push the top over the top page border */
    bottom: 0;
    width: 443px;
    max-width: 443px;
    z-index: 3;
    transition: right 0.2s, width 0.2s;
    flex: 1;
}

.kiwi-container--sidebar-drawn .kiwi-sidebar {
    right: 0;
}

.kiwi-container--sidebar-open .kiwi-sidebar {
    right: 0;
    top: 0;
    flex: 1;
    position: relative;
    border-left-width: 1px;
    border-left-style: solid;
    max-width: 430px;
    z-index: 1;
    transition: right 0.2s, top 0s;
}

.kiwi-container-content {
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: hidden;
}

.kiwi-messagelist {
    flex: 1;
}

.kiwi-serverview {
    flex: 1;
}

.kiwi-container--no-sidebar .kiwi-header,
.kiwi-container--no-sidebar .kiwi-messagelist {
    margin-right: 0;
}

.kiwi-container-toggledraw-statebrowser,
.kiwi-container-toggledraw-sidebar {
    display: none;
    width: 50px;
    position: absolute;
    top: 0;
    height: 45px;
    box-sizing: border-box;
    cursor: pointer;
    text-align: center;
    font-size: 1.6em;
    line-height: 50px;
    transition: left 2s;
    transition-delay: 0.5s;
}

.kiwi-container-toggledraw-statebrowser {
    left: 0;
}

.kiwi-container-toggledraw-sidebar {
    right: 0;
}

.kiwi-container-toggledraw-sidebar--disabled {
    cursor: default;
}

.kiwi-container-toggledraw-statebrowser-messagecount {
    position: absolute;
    font-size: 0.6em;
    border-radius: 3px;
    line-height: 2em;
    box-sizing: border-box;
    top: 10px;
    z-index: 3;
    white-space: nowrap;
    left: 14px;
    width: 37px;
    padding: 0;
    transition: all 0.4s, z-index 0s;
    transition-delay: 0.1s;
}

.kiwi-container-toggledraw-statebrowser-messagecount::after {
    left: -15px;
    top: 20%;
    border: 0.6em solid transparent;
    border-right-color: #ddd;
    content: " ";
    height: 0;
    width: 0;
    position: absolute;
    pointer-events: none;
}

.kiwi-container-statebrowser-messagecount-close {
    display: none;
}

/* When the Statebrowser is visible, apply new styles to the messagecount */
.kiwi-wrap--statebrowser-drawopen .kiwi-container-toggledraw-statebrowser-messagecount {
    left: -19px;
    z-index: 100;
}

.kiwi-wrap--statebrowser-drawopen .kiwi-container-toggledraw-statebrowser-messagecount::after {
    right: -15px;
    left: auto;
}

@keyframes kiwi-wiggle {
    0% { margin-left: 5px; }
    50% { margin-left: 0; }
    100% { margin-left: 5px; }
}

.kiwi-container-toggledraw-statebrowser-messagecount--highlight {
    animation: kiwi-wiggle 0.25s 4;
    animation-timing-function: ease-in, linear, ease-out;
}

.kiwi-container-toggledraw-statebrowser-messagecount--highlight:hover {
    animation: none;
}

.kiwi-container-empty {
    text-align: center;
    padding: 1em;
}

.kiwi-container-empty .u-button {
    border-radius: 3px;
    font-weight: 500;
    line-height: 50px;
    padding: 0 14px;
}

.kiwi-wrap .kiwi-container::after {
    content: '';
    position: absolute;
    left: auto;
    height: 120%;
    background-color: rgba(0, 0, 0, 0.4);
    top: 0;
    opacity: 0;
    z-index: 99;
    width: 0%;
    right: -100%;
    transition: opacity 0.1s;
    transition-delay: opacity 0.1s;
}

@media screen and (max-width: 1500px) {
    .kiwi-container--sidebar-open .kiwi-sidebar {
        max-width: 350px;
    }
}

@media screen and (max-width: 769px) {
    .kiwi-wrap--statebrowser-drawopen .kiwi-container-statebrowser-messagecount-alert {
        display: none;
    }

    .kiwi-wrap--statebrowser-drawopen .kiwi-container-statebrowser-messagecount-close {
        display: block;
    }

    .kiwi-wrap--statebrowser-drawopen .kiwi-container::after {
        top: 0;
        opacity: 1;
        width: 100%;
        right: 0%;
    }

    .kiwi-header {
        margin-left: 50px;
        margin-right: 50px;
        max-height: 50px;
    }

    .kiwi-container-toggledraw-statebrowser,
    .kiwi-container-toggledraw-sidebar {
        display: block;
    }

    .kiwi-sidebar {
        top: -4px;
    }
}

</style>
