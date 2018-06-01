<template>
    <div class="kiwi-container" v-bind:class="{
            /* 'kiwi-container-' + bufferType: true, */
            'kiwi-container--sidebar-open': uiState.isOpen,
            'kiwi-container--sidebar-pinned': uiState.isPinned,
            'kiwi-container--no-sidebar': buffer && !buffer.isChannel,
    }">
        <template v-if="buffer">
            <div @click.stop="toggleStateBrowser" class="kiwi-container-toggledraw-statebrowser">
                <div
                    class="kiwi-container-toggledraw-statebrowser-messagecount kiwi-container-toggledraw-statebrowser-messagecount--highlight"
                    :class="{'kiwi-container-toggledraw-statebrowser-messagecount--highlight': unreadMessages.highlight}"
                >{{unreadMessages.count > 999 ? '999+' : unreadMessages.count}}</div>
            </div>
            <container-header :buffer="buffer" :uiState="uiState"></container-header>

            <slot name="before"></slot>

            <div class="kiwi-container-content">
                <template v-if="buffer.isServer()">
                    <server-view :network="network" :buffer="buffer" :uiState="uiState"></server-view>
                </template>
                <template v-else>
                    <message-list :buffer="buffer" :users="users"></message-list>
                    <sidebar
                        v-if="buffer.isChannel()"
                        :network="network"
                        :buffer="buffer"
                        :users="users"
                        :uiState="uiState"
                    ></sidebar>
                </template>

                <slot name="after"></slot>
            </div>
        </template>
        <template v-else>
            <div class="kiwi-container-empty">
                <h4>{{$t('container_welcome')}}</h4>
                <a @click.stop="toggleStateBrowser" class="u-button">{{$t('container_statebrowser')}}</a>
            </div>
        </template>
    </div>
</template>

<script>

import state from '@/libs/state';
import ContainerHeader from './ContainerHeader';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import ServerView from './ServerView';

export default {
    components: {
        ContainerHeader,
        Sidebar,
        MessageList,
        ServerView,
    },
    data: function data() {
        return {
        };
    },
    props: ['network', 'buffer', 'users', 'uiState'],
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
            state.networks.forEach(network => {
                network.buffers.forEach(buffer => {
                    count += (buffer.flags.unread || 0);
                    if (buffer.flags.highlight) {
                        highlight = true;
                    }
                });
            });
            return { count, highlight };
        },
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
    created: function created() {
        this.listen(state, 'sidebar.toggle', () => {
            state.$emit('sidebar.' + (this.uiState.isOpen() ? 'hide' : 'show'));
        });
        this.listen(state, 'sidebar.show', () => {
            this.uiState.showNicklist();
        });
        this.listen(state, 'sidebar.hide', () => {
            this.uiState.close();
        });
        this.listen(state, 'userbox.show', (user, opts) => {
            this.uiState.showUser();
        });
    },
};
</script>

<style>
.kiwi-container {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    top: 4px;
}

/* When the sidebar is open we will put a shadow over the text area */
.kiwi-header {
    z-index: 1;

    /* IE 11 breaks when using the shorthand flex syntax here */
    flex-grow: 0;
    flex-shrink: 1;
}

.kiwi-sidebar {
    position: absolute;
    right: -443px;
    top: -4px; /* Push the top over the top page border */
    bottom: 0;
    width: 443px;
    max-width: 443px;
    z-index: 2;
    transition: right 0.2s, width 0.2s;
    flex: 1;
}

.kiwi-container--sidebar-open .kiwi-sidebar {
    right: 0;
}

.kiwi-container--sidebar-pinned .kiwi-sidebar {
    right: 0;
    top: 0;
    flex: 1;
    position: relative;
    border-left-width: 1px;
    border-left-style: solid;
    max-width: 430px;
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
    position: relative;
    font-size: 0.6em;
    border-radius: 3px;
    line-height: 2em;
    box-sizing: border-box;
    top: 10px;
    z-index: 3;
    white-space: nowrap;
    left: 6px;
    width: 37px;
    padding: 0;
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

@media screen and (max-width: 1500px) {
    .kiwi-container--sidebar-pinned .kiwi-sidebar {
        max-width: 350px;
    }
}

@media screen and (max-width: 769px) {
    .kiwi-header {
        margin-left: 50px;
        margin-right: 50px;
        max-height: 50px;
    }

    .kiwi-container-toggledraw-statebrowser,
    .kiwi-container-toggledraw-sidebar {
        display: block;
    }
}

</style>
