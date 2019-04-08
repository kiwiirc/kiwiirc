<template>
    <div class="kiwi-typinguserslist">
        <span
            v-for="(user, idx) in typingUsers"
            :key="user.nick"
            :style="{ color: userColour(user) }"
        >
            {{ user.nick }}{{ idx < typingUsers.length - 1 ? ',' : '' }}
        </span> {{ typingUsers.length > 0 ? '…' : '' }}
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
            return this.buffer.users;
        },
        typingUsers() {
            return Object.values(this.users).filter(u => u.nick !== this.$state.getActiveNetwork().nick && u.typingStatus(this.buffer.name).status);
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

</style>
