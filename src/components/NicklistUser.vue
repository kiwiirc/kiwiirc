<template>
    <li
        :class="[
            nicklist.userMode(user) ? 'kiwi-nicklist-user--mode-' + nicklist.userMode(user) : '',
            user.away ? 'kiwi-nicklist-user--away' : '',
            user.ignore ? 'kiwi-nicklist-user--ignore' : '',
        ]"
        class="kiwi-nicklist-user"
        @click="nicklist.openUserbox(user)"
    >
        <span
            :style="{ 'background': userStatus }"
            class="kiwi-user-availability"
        />
        <span class="kiwi-nicklist-user-prefix">{{ nicklist.userModePrefix(user) }}</span>
        <span
            :style="{ 'color': userColour }"
            class="kiwi-nicklist-user-nick"
        >{{ user.nick }}
        </span>
        <span class="kiwi-nicklist-messageuser" @click.stop="nicklist.openQuery(user)">
            <i class="fa fa-comment" aria-hidden="true"/>
        </span>
    </li>
</template>

<script>

'kiwi public';

import state from '@/libs/state';

export default {
    props: ['user', 'nicklist'],
    computed: {
        userColour() {
            if (this.nicklist.useColouredNicks) {
                return this.user.getColour();
            }
            return '';
        },
        userStatus() {
            if (state.getActiveNetwork().ircClient.network.cap.isEnabled('account-notify')) {
                return this.user.userStatus(this.user);
            }
            return '';
        },
    },
};
</script>

<style>

.kiwi-nicklist-user {
    line-height: 26px;
    padding: 0 16px 0 12px;
    margin: 0;
    position: relative;
    box-sizing: border-box;
    transition: all 0.1s;
    cursor: pointer;
}

.kiwi-nicklist-user-nick {
    font-weight: bold;
    cursor: pointer;
}

.kiwi-nicklist-messageuser {
    position: absolute;
    content: '\f075';
    right: -1em;
    font-family: fontAwesome, sans-serif;
    line-height: 30px;
    opacity: 0;
}

.kiwi-user-availability {
    height: 7px;
    width: 7px;
    display: inline-block;
    border-radius: 50%;
    border: 1px solid #e1e1e1;
    margin: 0 2px 0 0;
}

.kiwi-nicklist-messageuser:hover {
    cursor: pointer;
    transition: all 0.1s;
}

.kiwi-nicklist-user:hover .kiwi-nicklist-messageuser {
    opacity: 1;
    right: 1em;
    transition: all 0.2s;
    transition-delay: 0.1s;
}

</style>
