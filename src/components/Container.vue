<template>
    <div class="kiwi-container" v-bind:class="'kiwi-container-' + bufferType">
        <template v-if="buffer">
            <div @click.stop="toggleStateBrowser" class="kiwi-container-toggledraw-statebrowser">
                ::
            </div>
            <container-header :buffer="buffer"></container-header>
            <div class="kiwi-container-toggledraw-nicklist">
                ::
            </div>

            <nicklist
                v-if="buffer.isChannel()"
                :network="network"
                :buffer="buffer"
                :users="users"
            ></nicklist>
            <message-list :buffer="buffer" :messages="messages"></message-list>
        </template>
        <template v-else>
            Welcome to Kiwi IRC! Select a channel on the left. Bla bla.
        </template>
    </div>
</template>

<script>

import state from '../libs/state';
import ContainerHeader from './ContainerHeader';
import Nicklist from './Nicklist';
import MessageList from './MessageList';

export default {
    components: {
        ContainerHeader,
        Nicklist,
        MessageList,
    },
    props: ['network', 'buffer', 'users', 'messages'],
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
    },
    methods: {
        toggleStateBrowser: function toggleStateBrowser() {
            state.$emit('statebrowser.toggle');
        },
    },
};
</script>

<style>

.kiwi-container {
    box-sizing: border-box;
}
.kiwi-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 200px;
    height: 50px;
    z-index: 1; /* Kepe it above the message list */
}
.kiwi-nicklist {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 200px;
}
.kiwi-messagelist {
    position: absolute;
    left: 0;
    top: 50px;
    right: 250px;
    bottom: 0;
}

.kiwi-container-toggledraw-statebrowser,
.kiwi-container-toggledraw-nicklist {
    display: none;
    width: 50px;
    display: inline-block;
    position: absolute;
    top: 0;
    height: 50px;
    background: blue;
}
.kiwi-container-toggledraw-statebrowser {
    left: 0;
}
.kiwi-container-toggledraw-nicklist {
    right: 0;
}

@media screen and (max-width: 500px) {
    .kiwi-header {
        left: 50px;
        right: 50px;
    }
    .kiwi-nicklist {
        right: -200px;
    }
    .kiwi-messagelist {
        right: 0;
    }
    .kiwi-container-toggledraw-statebrowser,
    .kiwi-container-toggledraw-nicklist {
        display: inline-block;
    }
}
</style>
