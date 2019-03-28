<template>
    <div class="kiwi-typinguserslist">
        <span v-for="user in typingUsers" :key="user.nick" :style="{ color: userColour(user) }">
            {{user.nick}} <TypingStatusIndicator :user="user" />
        </span>
    </div>
</template>
<script>
'kiwi public';
import TypingStatusIndicator from './TypingStatusIndicator';

export default {
    components: {
        TypingStatusIndicator
    },
    props: ['buffer'],
    computed: {
        users() {
            return this.buffer.users;
        },
        typingUsers() {
            return Object.values(this.users).filter(u => u.typingState != '');
        }
    },
    methods: {
        userColour(user) {
            return user && this.buffer.setting('colour_nicknames_in_messages') ? user.getColour() : '';
        },
    }
}
</script>
<style>

    .kiwi-typinguserslist {
        position: absolute;
        bottom: 0;
        width: 100%;
    }

    .kiwi-typinguserslist span {
        margin-right: 4px;
        border-radius: 2px;
    }

</style>
