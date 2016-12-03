<template>
    <div class="kiwi-container" v-bind:class="'kiwi-container-' + bufferType">
        <template v-if="buffer">
            <container-header :buffer="buffer"></container-header>
            <nicklist
                v-if="buffer.isChannel()"
                :network="network"
                :buffer="buffer"
                :users="users"
            ></nicklist>
            <message-list :buffer="buffer" :messages="messages"></message-list>
        </template>
    </div>
</template>

<script>
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
};
</script>

<style>

.kiwi-container {
    box-sizing: border-box;
}
.kiwi-nicklist {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 200px;
}
.kiwi-header {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    z-index: 1; /* Kepe it above the message list */
}

@media screen and (max-width: 500px) {
    .kiwi-header {
        left: 35px; /* Small screens have the statebrowser tab in the top left */
    }
}
.kiwi-messagelist {
    position: absolute;
    left: 0;
    top: 50px;
    right: 0;
    bottom: 0;
}

.kiwi-container-channel .kiwi-header {
    right: 200px;
}
.kiwi-container-channel .kiwi-messagelist {
    right: 200px;
}
</style>
