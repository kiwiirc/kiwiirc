<template>
    <div class="kiwi-selfuser kiwi-theme-bg">
        <div v-if="!selfUserSettingsOpen" class="kiwi-selfuser-mask">
            <span class="kiwi-selfuser-nick">
                <i class="fa fa-user-circle-o" aria-hidden="true" />
                {{ network.nick }}
                <span class="kiwi-selfuser-modes">( {{ modeString }} )</span>
                <i class="fa fa-cog" aria-hidden="true" @click="openSelfActions('Nick')" />
            </span>
            <span class="kiwi-selfuser-host">
                <i class="fa fa-server" aria-hidden="true" />
                {{ netUser.username }}@{{ netUser.host }}
            </span>
            <span class="kiwi-selfuser-status">
                <i class="fa fa-info-circle" aria-hidden="true" />
                <span class="kiwi-selfuser-status-show">Availible</span>
                <i class="fa fa-cog" aria-hidden="true" @click="openSelfActions('Status')" />
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
            newNick: '',
            error_message: '',
            selfUserSettingsOpen: false,
            selfUserSettingsDisplay: false,
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
.kiwi-selfuser {
    box-sizing: border-box;
}

.kiwi-controlinput-selfuser.kiwi-controlinput-selfuser--open {
    width: 300px;
    box-sizing: border-box;
}

.kiwi-selfuser-nick,
.kiwi-selfuser-host,
.kiwi-selfuser-status {
    display: inline-block;
    padding: 0.5em 10px;
    border-right: 1px solid #0003;
    cursor: default;
    width: 100%;
    box-sizing: border-box;
    border-bottom: 1px solid #f5f5f5;
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
    float: right;
    margin-left: 5px;
    opacity: 0.6;
    transition: all 0.2s;
    cursor: pointer;
}

.kiwi-selfuser-nick i:last-of-type:hover,
.kiwi-selfuser-status i:last-of-type:hover {
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
