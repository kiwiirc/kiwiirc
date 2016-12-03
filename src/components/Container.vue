<template>
    <div class="kiwi-container" v-bind:class="{
            /* 'kiwi-container-' + bufferType: true, */
            'kiwi-container--nicklist-open': nicklistOpen,
            'kiwi-container--no-nicklist': !buffer.isChannel(),
    }">
        <template v-if="buffer">
            <div @click.stop="toggleStateBrowser" class="kiwi-container-toggledraw-statebrowser">
                <i class="fa fa-bars" aria-hidden="true"></i>
            </div>
            <container-header :buffer="buffer"></container-header>
            <div @click.stop="toggleNicklist" v-bind:class="{
                'kiwi-container-toggledraw-nicklist': true,
                'kiwi-container-toggledraw-nicklist--disabled': !buffer.isChannel()
            }">
                <i class="fa fa-users" aria-hidden="true"></i>
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
            <a @click.stop="toggleStateBrowser">Show statebrowser</a>
        </template>
    </div>
</template>

<script>

import state from 'src/libs/state';
import ContainerHeader from './ContainerHeader';
import Nicklist from './Nicklist';
import MessageList from './MessageList';

export default {
    components: {
        ContainerHeader,
        Nicklist,
        MessageList,
    },
    data: function data() {
        return {
            nicklistOpen: false,
        };
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
        toggleNicklist: function toggleNicklist() {
            if (this.buffer.isChannel()) {
                state.$emit('nicklist.toggle');
            }
        },
    },
    created: function created() {
        state.$on('nicklist.toggle', () => {
            this.nicklistOpen = !this.nicklistOpen;
        });
        state.$on('nicklist.show', () => {
            this.nicklistOpen = true;
        });
        state.$on('nicklist.hide', () => {
            this.nicklistOpen = false;
        });
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
    min-height: 50px;
    z-index: 1; /* Keep it above the message list */
}
.kiwi-nicklist {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 200px;
    z-index: 1;
}
.kiwi-messagelist {
    position: absolute;
    left: 0;
    top: 50px;
    right: 200px;
    bottom: 0;
}

.kiwi-container--no-nicklist .kiwi-header,
.kiwi-container--no-nicklist .kiwi-messagelist {
    right: 0;
}

.kiwi-container-toggledraw-statebrowser,
.kiwi-container-toggledraw-nicklist {
    display: none;
    width: 50px;
    position: absolute;
    top: 0;
    height: 50px;
    background: #f6f6f6;
    z-index: 1;
    cursor: pointer;
    text-align: center;
    font-size: 1.6em;
    border-bottom: 1px solid #dddddd;
    box-sizing: border-box;
    line-height: 50px;
}

.kiwi-container-toggledraw-statebrowser {
    left: 0;
    border-right: 1px solid #dddddd;
}
.kiwi-container-toggledraw-nicklist {
    right: 0;
    border-left: 1px solid #dddddd;
}
.kiwi-container-toggledraw-nicklist--disabled {
    color: #b8babd;
    cursor: default;
}

@media screen and (max-width: 500px) {
    .kiwi-header {
        left: 50px;
        right: 50px;
    }
    .kiwi-nicklist {
        right: -200px;
        top: 50px;
    }
    .kiwi-messagelist {
        right: 0;
    }
    .kiwi-container-toggledraw-statebrowser,
    .kiwi-container-toggledraw-nicklist {
        display: block;
    }

    .kiwi-container--nicklist-open .kiwi-nicklist {
        right: 0;
    }

}

</style>
