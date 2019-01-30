<template>
    <li
        :class="[
            nicklist.userMode(user) ? 'kiwi-nicklist-user--mode-' + nicklist.userMode(user) : '',
            user.away ? 'kiwi-nicklist-user-status-away' : 'kiwi-nicklist-user-status-available',
            user.ignore ? 'kiwi-nicklist-user--ignore' : '',
        ]"
        class="kiwi-nicklist-user"
        @click="nicklist.openUserbox(user)"
    >
        <span class="away-status-indicator"/>
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
            let activeNetworkState = this.$state.getActiveNetwork();
            if (activeNetworkState.ircClient.network.cap.isEnabled('away-notify')) {
                return this.user.getUserStatus();
            }
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

.kiwi-nicklist-user-status-available > .away-status-indicator {
    display: inline-block;
    width: 7px;
    height: 7px;
    border: 1px solid #e1e1e1;
    border-radius: 50%;
    margin: 0 4px 0 0;
    background-color: green;
}

.kiwi-nicklist-user-status-away > .away-status-indicator {
    display: inline-block;
    width: 7px;
    height: 7px;
    border: 1px solid #e1e1e1;
    border-radius: 50%;
    margin: 0 4px 0 0;
    background: red;
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
