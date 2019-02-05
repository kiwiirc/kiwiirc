<template>
    <div class="kiwi-selfuser kiwi-theme-bg">
        <div v-if="!selfUserSettingsOpen" class="kiwi-selfuser-mask">
            <span class="kiwi-selfuser-nick">
                <away-status-indicator :user="currentUser"/>
                {{ network.nick }}
                <span class="kiwi-selfuser-modes">( {{ modeString }} )</span>
                <i class="fa fa-pencil" aria-hidden="true" @click="openSelfActions('Nick')" />
            </span>
            <span class="kiwi-selfuser-host">
                {{ netUser.username }}@{{ netUser.host }}
            </span>
        </div>
        <div v-if="selfUserSettingsOpen" class="kiwi-selfuser-actions">
            <div v-if="error_message" class="kiwi-selfuser-error-message">{{ error_message }}</div>
            <form v-if="selfUserSettingsDisplay === 'Nick'" class="u-form">
                <span class="u-input-prompt-label">{{ $t('change_nick') }}</span>
                <input v-model="newNick"
                       type="text" class="u-input" placeholder="Enter new nickname...">
                <span class="u-input-button-container">
                    <a class="u-button u-button-primary"
                       @click="userNameUpdate(newNick)">{{ $t('ok') }}
                    </a>
                    <a class="u-button u-button-warning"
                       @click="userNameCancel()">{{ $t('cancel') }}
                    </a>
                </span>
            </form>
            <a v-if="selfUserSettingsDisplay === 'Status'" href="#">Set Away</a>
        </div>
    </div>
</template>

<script>

'kiwi public';

import state from '@/libs/state';
import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        AwayStatusIndicator,
    },
    props: ['network'],
    data: function data() {
        return {
            newNick: '',
            error_message: '',
            selfUserSettingsOpen: false,
            selfUserSettingsDisplay: false,
        };
    },
    computed: {
        currentUser() {
            let activeNetworkState = this.$state.getActiveNetwork();
            return this.$state.getUser(activeNetworkState.id, activeNetworkState.nick);
        },
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
        openSelfActions(option) {
            this.selfUserSettingsOpen = true;
            this.selfUserSettingsDisplay = option;
        },
        userNameUpdate(newNick) {
            if (newNick.length !== 0) {
                this.error_message = '';
                let nick = newNick.trim();
                if (!nick.match(/(^[0-9])|(\s)/)) {
                    this.network.ircClient.changeNick(nick);
                    this.userNameCancel();
                }
            } else {
                this.error_message = 'You must enter a new username';
            }
        },
        userNameCancel() {
            this.selfUserSettingsOpen = false;
            this.selfUserSettingsDisplay = false;
        },
        checkUserAway() {
            let activeNetworkState = this.buffer.getNetwork();
            return state.getUser(activeNetworkState.id, activeNetworkState.nick).away;
        },
    },
};
</script>

<style>
.kiwi-selfuser-nick,
.kiwi-selfuser-host,
.kiwi-selfuser-status {
    display: inline-block;
    padding: 0 10px;
    line-height: 34px;
    cursor: default;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-selfuser-nick {
    min-width: 85px;
    font-weight: bold;
    border-bottom: 1px solid #f5f5f5;
}

.kiwi-selfuser-modes {
    font-weight: normal;
    opacity: 0.8;
    font-size: 0.8em;
}

.kiwi-selfuser-host {
    font-style: italic;
    opacity: 0.8;
    padding-left: 27px;
    font-size: 0.8em;
    word-break: break-all;
}

.kiwi-selfuser-status .kiwi-selfuser-status-show {
    display: inline-block;
    padding: 2px 10px;
    background-color: green;
    color: #fff;
    border-radius: 4px;
}

.kiwi-controlinput-selfuser .kiwi-close-icon {
    line-height: 36px;
    border-radius: 0;
}

/* Style the icons in the SelfUser */

.kiwi-selfuser-nick i {
    font-weight: 400;
    float: right;
    margin-left: 5px;
    opacity: 0.6;
    cursor: pointer;
    line-height: 36px;
    transition: all 0.3s;
}

.kiwi-selfuser-nick i:hover {
    opacity: 1;
    transition: all 0.2s;
}

.kiwi-selfuser-error-message {
    width: 100%;
    display: block;
    padding: 0.5em 10px;
    background: #d16c6c;
    color: #fff;
    box-sizing: border-box;
    margin: 0 0 10px 0;
    text-align: center;
    border-radius: 4px;
}

.kiwi-selfuser-actions {
    padding: 1em 10px;
}

.kiwi-selfuser-actions form {
    width: 100%;
    position: relative;
}

.kiwi-selfuser-actions form .u-input-prompt-label {
    display: block;
    width: 100%;
}

.kiwi-selfuser-actions form .u-input {
    width: 100%;
    margin: 0;
}

.kiwi-selfuser-actions form .u-input-button-container {
    position: absolute;
    bottom: 2px;
    right: 2px;
    z-index: 1;
}

.kiwi-selfuser-actions .u-input {
    margin-bottom: 10px;
}
</style>
