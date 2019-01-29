<template>
    <div class="kiwi-selfuser kiwi-theme-bg">
        <div class="kiwi-selfuser-mask">
            <span class="kiwi-selfuser-nick">
                <i class="fa fa-user-circle-o" aria-hidden="true" />
                {{ network.nick }}
                <span class="kiwi-selfuser-modes">( {{ modeString }} )</span>
                <i class="fa fa-cog" aria-hidden="true" />
            </span>
            <span class="kiwi-selfuser-host">
                <i class="fa fa-server" aria-hidden="true" />
                {{ netUser.username }}@{{ netUser.host }}
            </span>
            <span class="kiwi-selfuser-status">
                <i class="fa fa-info-circle" aria-hidden="true" />
                <span class="kiwi-selfuser-status-show">Availible</span>
                <i class="fa fa-cog" aria-hidden="true" />
            </span>
        </div>
        <div v-if="selfUserSettingsOpen" class="kiwi-selfuser-actions">
            <div v-if="error_message">{{ error_message }}</div>
            <input-prompt :label="$t('change_nick')+':'" @submit="changeNick">
                <a class="u-link">{{ $t('change_nick') }}</a>
            </input-prompt>
            <a href="#">Set Away</a>
        </div>
        <div class="kiwi-close-icon" @click="$emit('close')">
            <i class="fa fa-times" aria-hidden="true"/>
        </div>
    </div>
</template>

<script>

'kiwi public';

import state from '@/libs/state';

export default {
    props: ['network'],
    data: function data() {
        return {
            error_message: '',
            selfUserSettingsOpen: false,
        };
    },
    computed: {
        modeString() {
            let str = '';
            this.network.ircClient.user.modes.forEach((mode) => {
                str += mode;
            });

            // Only show the + if there are modes to show
            if (str) {
                str = '+' + str;
            }

            return str;
        },
        netUser() {
            return this.network.ircClient.user;
        },
    },
    created() {
        this.listen(this.network.ircClient, 'nick in use', (event) => {
            this.error_message = `The nickname '${event.nick}' is already in use!`;
        });
    },
    methods: {
        changeNick(newNick) {
            this.error_message = '';

            let nick = newNick.trim();
            if (!nick.match(/(^[0-9])|(\s)/)) {
                this.network.ircClient.changeNick(newNick);
            }
        },
        checkUserAway() {
            let activeNetworkState = this.buffer.getNetwork();
            return state.getUser(activeNetworkState.id, activeNetworkState.nick).away;
        },
    },
};
</script>

<style>
.kiwi-selfuser {
    box-sizing: border-box;
}

.kiwi-controlinput-selfuser.kiwi-controlinput-selfuser--open {
    padding-right: 22px;
}

.kiwi-selfuser-nick,
.kiwi-selfuser-host,
.kiwi-selfuser-status {
    display: inline-block;
    padding: 0.5em 10px;
    border-right: 1px solid #0003;
    cursor: default;
}

.kiwi-selfuser-nick {
    min-width: 85px;
    font-weight: bold;
}

.kiwi-selfuser-modes {
    font-weight: normal;
    opacity: 0.8;
    font-size: 0.8em;
}

.kiwi-selfuser-host {
    font-style: italic;
}

.kiwi-selfuser-status .kiwi-selfuser-status-show {
    display: inline-block;
    padding: 2px 6px;
    background-color: green;
    color: #fff;
    border-radius: 4px;
}

.kiwi-controlinput-selfuser .kiwi-close-icon {
    line-height: 36px;
    border-radius: 0;
}

/* Style the icons in the SelfUser */

.kiwi-selfuser-nick i,
.kiwi-selfuser-host i,
.kiwi-selfuser-status i {
    font-weight: 400;
    line-height: 22px;
}

.kiwi-selfuser-host i,
.kiwi-selfuser-nick i:first-of-type,
.kiwi-selfuser-status i:first-of-type {
    margin-right: 6px;
    cursor: default;
}

.kiwi-selfuser-nick i:last-of-type,
.kiwi-selfuser-status i:last-of-type {
    margin-left: 8px;
    opacity: 0.6;
    transition: all 0.2s;
    cursor: pointer;
}

.kiwi-selfuser-nick i:last-of-type:hover,
.kiwi-selfuser-status i:last-of-type:hover {
    opacity: 1;
    transition: all 0.2s;
}

.kiwi-selfuser-actions {
    margin-top: 1em;
    padding-top: 1em;
}

.kiwi-selfuser-actions .u-input {
    margin-bottom: 10px;
}
</style>
