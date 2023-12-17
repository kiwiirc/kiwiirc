<template>
    <div
        :class="{
            'kiwi-nicklist-user--away': user.isAway() || user.isOffline(),
            'kiwi-nicklist-user--ignore': user.ignore,
        }"
        v-bind="dataAttributes"
        class="kiwi-nicklist-user"
        @click.stop="nicklist.openUserbox(user)"
    >
        <div v-if="nicklist.shouldShowAvatars" class="kiwi-nicklist-avatar">
            <UserAvatar
                v-bind="nicklist.avatarProps"
                :user="user"
                :network="network"
                size="small"
            />
        </div>
        <AwayStatusIndicator
            v-else
            :network="network"
            :user="user"
            :toggle="false"
            class="kiwi-nicklist-awaystatus"
        />
        <span class="kiwi-nicklist-user-prefix">{{ userModePrefix }}</span>
        <span
            class="kiwi-nicklist-user-nick"
            :style="{ color: userColour }"
        >{{ user.nick }} </span>
        <div class="kiwi-nicklist-user-buttons">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="kiwi-nicklist-user-typing"
                :class="{
                    'kiwi-nicklist-user-typing--active': userTypingState === 'active',
                    'kiwi-nicklist-user-typing--paused': userTypingState === 'paused',
                }"
            >
                <circle cx="4" cy="12" r="3" />
                <circle cx="12" cy="12" r="3" />
                <circle cx="20" cy="12" r="3" />
            </svg>

            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 36 36"
                class="kiwi-nicklist-user-message"
                @click.stop="nicklist.openQuery(user)"
            >
                <path
                    d="M18 1C8.059 1 0 7.268 0 15c0 4.368 2.574 8.268 6.604 10.835C6.08 28.144
                        4.859 31.569 2 35c5.758-.96 9.439-3.761 11.716-6.416c1.376.262 2.805.416
                        4.284.416c9.941 0 18-6.268 18-14S27.941 1 18 1z"
                />
            </svg>
        </div>
    </div>
</template>

<script>
'kiwi public';

import AwayStatusIndicator from './AwayStatusIndicator';
import TypingStatusIndicator from './TypingStatusIndicator';
import UserAvatar from './UserAvatar';

export default {
    components: {
        AwayStatusIndicator,
        TypingStatusIndicator,
        UserAvatar,
    },
    props: ['network', 'user', 'nicklist'],
    computed: {
        dataAttributes() {
            const attrs = Object.create(null);
            attrs['data-nick'] = this.user.nick.toLowerCase();

            if (this.user.account) {
                attrs['data-account'] = this.user.account.toLowerCase();
            }

            const userMode = this.nicklist.buffer.userMode(this.user);
            if (userMode) {
                attrs['data-mode'] = userMode;
            }

            return attrs;
        },
        userColour() {
            if (this.nicklist.useColouredNicks) {
                return this.user.getColour();
            }
            return '';
        },
        userModePrefix() {
            return this.nicklist.buffer.userModePrefix(this.user);
        },
        userTypingState() {
            const status = this.user.typingStatus(this.nicklist.buffer.name).status;
            // console.log('userTypingState', this.user.nick, status);
            return status;
        },
    },
};
</script>

<style lang="less">
.kiwi-nicklist-user {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: 26px;
    max-height: 26px;
    padding: 0 10px;
    line-height: initial;
    white-space: nowrap;
    cursor: pointer;
    border-left: 4px solid transparent;
    transition: all 0.1s;

    .kiwi-nicklist--avatars & {
        height: 38px;
        max-height: 38px;
        padding: 4px 10px;
    }
}

.kiwi-nicklist-avatar {
    position: relative;
    flex-shrink: 0;
    margin-right: 10px;

    .kiwi-avatar {
        width: 30px;
        height: 30px;
    }
}

.kiwi-nicklist-awaystatus {
    flex-shrink: 0;
    margin-right: 6px;
    border: none;
}

.kiwi-nicklist-user-prefix {
    flex-shrink: 0;
}

.kiwi-nicklist-user-nick {
    display: block;
    flex: 1;
    margin-right: 10px;
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
}

.kiwi-nicklist-user-buttons {
    position: relative;
    display: flex;
    align-items: center;
}

.kiwi-nicklist-user-typing {
    width: 18px;
    height: 18px;
    visibility: hidden;
    opacity: 1;

    &--active,
    &--paused {
        visibility: visible;
    }

    > circle {
        opacity: 0.2;
        animation: 1.2s blink infinite;
        animation-play-state: paused;

        &:nth-child(2) {
            animation-delay: 0.3s;
        }

        &:nth-child(3) {
            animation-delay: 0.6s;
        }
    }

    &--active > circle {
        animation-play-state: running;
    }

    .kiwi-nicklist-user:hover & {
        opacity: 0;
        transition: opacity 0.3s;
    }

    @keyframes blink {
        33% {
            opacity: 0.9;
        }
    }
}

.kiwi-nicklist-user-message {
    position: absolute;
    right: -36px;
    width: 18px;
    height: 18px;
    opacity: 0;
    transition: right 0.3s, opacity 0.3s, fill 0.1s;

    .kiwi-nicklist-user:hover & {
        right: 0;
        opacity: 1;
    }
}
</style>
