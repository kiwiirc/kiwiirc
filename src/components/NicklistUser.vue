<template>
    <div
        :class="[
            nicklist.userMode(user) ? 'kiwi-nicklist-user--mode-' + nicklist.userMode(user) : '',
            user.away ? 'kiwi-nicklist-user--away' : '',
            user.ignore ? 'kiwi-nicklist-user--ignore' : '',
        ]"
        :data-nick="(user.nick||'').toLowerCase()"
        class="kiwi-nicklist-user"
        @click="nicklist.openUserbox(user)"
    >
        <div v-if="shouldShowAvatars" class="kiwi-avatar-container">
            <Avatar
                v-if="user"
                :user="user"
                size="small"
            />
            <away-status-indicator
                :network="network"
                :user="user"
                :toggle="false"
            />
        </div>
        <div v-else>
            <away-status-indicator
                :network="network"
                :user="user"
                :toggle="false"
            />
        </div>
        <span class="kiwi-nicklist-user-prefix">{{ nicklist.userModePrefix(user) }}</span><span
            :style="{ 'color': userColour }"
            class="kiwi-nicklist-user-nick"
        >{{ user.nick }}
        </span>
        <span class="kiwi-nicklist-messageuser" @click.stop="nicklist.openQuery(user)">
            <i class="fa fa-comment" aria-hidden="true"/>
        </span>
        <typing-status-indicator :user="user" :buffer="nicklist.buffer" />
    </div>
</template>

<script>
'kiwi public';

import AwayStatusIndicator from './AwayStatusIndicator';
import TypingStatusIndicator from './TypingStatusIndicator';
import Avatar from './Avatar';

export default {
    components: {
        AwayStatusIndicator,
        TypingStatusIndicator,
        Avatar,
    },
    props: ['network', 'user', 'nicklist'],
    computed: {
        userColour() {
            if (this.nicklist.useColouredNicks) {
                return this.user.getColour();
            }
            return '';
        },
        shouldShowAvatars() {
            return this.nicklist.buffer.setting('nicklist_avatars');
        },
    },
};
</script>

<style>

.kiwi-nicklist-user {
    line-height: 26px;
    padding: 0 12px 0 12px;
    border-left: 4px solid;
    margin: 0 0 0 0;
    position: relative;
    box-sizing: border-box;
    transition: all 0.1s;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
}

.kiwi-nicklist--avatars .kiwi-nicklist-user {
    line-height: 32px;
    padding-bottom: 6px;
}

.kiwi-nicklist-user-nick {
    font-weight: bold;
    cursor: pointer;
    flex: 1;
}

.kiwi-nicklist-messageuser {
    position: absolute;
    content: '\f075';
    right: -1em;
    font-family: fontAwesome, sans-serif;
    line-height: 26px;
    opacity: 0;
}

.kiwi-nicklist-messageuser:hover {
    cursor: pointer;
    transition: all 0.2s;
}

.kiwi-nicklist-user:hover .kiwi-nicklist-messageuser {
    opacity: 1;
    right: 1em;
    transition: all 0.2s;
    transition-delay: 0.1s;
}

.kiwi-avatar-container {
    position: relative;
    margin-right: 10px;
    flex: 0;
}

.kiwi-avatar-container .kiwi-avatar {
    width: 30px;
    height: 30px;
}

.kiwi-avatar-container .kiwi-awaystatusindicator {
    position: absolute;
    top: 0;
    right: 0;
    margin: 0;
}

.kiwi-avatar-container-user-prefix {
    flex: 0;
}

</style>
