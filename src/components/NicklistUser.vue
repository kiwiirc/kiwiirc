<template functional>
    <div
        :class="[
            props.nicklist.userMode(props.user) ?
                'kiwi-nicklist-user--mode-' + props.nicklist.userMode(props.user) :
                '',
            props.user.away ? 'kiwi-nicklist-user--away' : '',
            props.user.ignore ? 'kiwi-nicklist-user--ignore' : '',
            data.staticClass,
        ]"
        :data-nick="(props.user.nick||'').toLowerCase()"
        class="kiwi-nicklist-user"
        @click="props.nicklist.openUserbox(props.user)"
    >
        <div v-if="props.m().shouldShowAvatars()" class="kiwi-avatar-container">
            <component
                :is="injections.components.Avatar"
                v-if="props.user"
                :user="props.user"
                size="small"
            />
            <component
                :is="injections.components.AwayStatusIndicator"
                :network="props.network"
                :user="props.user"
                :toggle="false"
            />
        </div>
        <div v-else>
            <component
                :is="injections.components.AwayStatusIndicator"
                :network="props.network"
                :user="props.user"
                :toggle="false"
            />
        </div>
        <span class="kiwi-nicklist-user-prefix">
            {{ props.nicklist.userModePrefix(props.user) }}
        </span><span
            :style="{ 'color': props.m().userColour() }"
            class="kiwi-nicklist-user-nick"
        >{{ props.user.nick }}
        </span>
        <span class="kiwi-nicklist-messageuser" @click.stop="props.nicklist.openQuery(props.user)">
            <i class="fa fa-comment" aria-hidden="true" />
        </span>
        <component
            :is="injections.components.TypingStatusIndicator"
            :user="props.user"
            :buffer="props.nicklist.buffer"
        />
    </div>
</template>

<script>
'kiwi public';

import AwayStatusIndicator from './AwayStatusIndicator';
import TypingStatusIndicator from './TypingStatusIndicator';
import Avatar from './Avatar';

const methods = {
    props: {},
    userColour() {
        let props = this.props;
        if (props.nicklist.useColouredNicks) {
            return props.user.getColour();
        }
        return '';
    },
    shouldShowAvatars() {
        let props = this.props;
        return props.nicklist.buffer.setting('nicklist_avatars');
    },
};

export default {
    inject: {
        components: {
            default: {
                AwayStatusIndicator,
                TypingStatusIndicator,
                Avatar,
            },
        },
    },
    props: {
        network: Object,
        user: Object,
        nicklist: Object,
        m: {
            default: function m() {
                // vue uses this function to generate the prop. `this`==null Return our own function
                return function n() {
                    // Give our methods some props context before its function is called.
                    // This is only safe because the function on the methods object is called on
                    // the same js tick
                    methods.props = this;
                    return methods;
                };
            },
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
    display: block;
    width: 100%;
    padding-right: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
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
