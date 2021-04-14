<template>
    <div class="kiwi-typinguserslist">
        <span
            v-for="(user, idx) in typingUsers"
            :key="user.nick"
            :style="{ color: userColour(user) }"
            class="kiwi-typing"
        >
            {{ user.nick }}{{ typingUsers.length - 1 > idx ? ',' : '' }}
        </span> {{ typingUsers.length > 0 ? '' : '' }}
    </div>
</template>
<script>
'kiwi public';

import TypingStatusIndicator from './TypingStatusIndicator';

export default {
    components: {
        TypingStatusIndicator,
    },
    props: ['buffer'],
    computed: {
        users() {
            if (this.buffer.isQuery()) {
                // if this is a query return the target as users
                let network = this.$state.getActiveNetwork();
                let user = this.$state.getUser(network.id, this.buffer.name);
                return user ? { [user.nick]: user } : {};
            }
            return this.buffer.users;
        },
        typingUsers() {
            let myNick = this.$state.getActiveNetwork().nick;
            return Object.values(this.users).filter((u) => u.nick !== myNick
                && u.typingStatus(this.buffer.name).status);
        },
    },
    methods: {
        userColour(user) {
            return user && this.buffer.setting('colour_nicknames_in_messages') ? user.getColour() : '';
        },
    },
};
</script>
<style>

.kiwi-typinguserslist {
    font-size: 0.9em;
}

.kiwi-typing::after {
    display: inline-block;
    animation: dotty steps(1, end) 1s infinite;
    content: '';
}

@keyframes dotty {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
    100% { content: ''; }
}

</style>
