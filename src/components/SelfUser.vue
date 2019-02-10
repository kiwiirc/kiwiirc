<template>
    <div class="kiwi-selfuser kiwi-theme-bg">
        <div v-if="!self_user_settings_open" class="kiwi-selfuser-mask">
            <span class="kiwi-selfuser-nick">
                <away-status-indicator :user="netUser"/>
                {{ network.nick }}
                <i class="fa fa-times" aria-hidden="true" @click="closeSelfUser()"/>
                <i class="fa fa-pencil" aria-hidden="true" @click="openSelfActions('Nick')" />
            </span>
            <span class="kiwi-selfuser-host">
                {{ netUser.username }}@{{ netUser.host }} ( {{ modeString }} )
            </span>
        </div>
        <div v-if="self_user_settings_open" class="kiwi-selfuser-actions">
            <div class="kiwi-selfuser-away-return-icon" @click="self_user_settings_open = false">
                <i class="fa fa-times" aria-hidden="true"/>
            </div>
            <form class="u-form">
                <label class="kiwi-selfuser-away-label">
                    <span>Away</span>
                    <input v-model="awayStatus" type="checkbox" >
                </label>
                <input v-model="newNick"
                       type="text" class="u-input" placeholder="Enter new nickname...">
                <span class="u-input-button-container">
                    <a class="u-button u-button-primary"
                       @click="userNameUpdate(newNick)">
                        Update
                    </a>
                </span>
            </form>
            <div v-if="error_message" class="kiwi-selfuser-error-message">{{ error_message }}</div>
        </div>
    </div>
</template>

<script>

'kiwi public';

import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        AwayStatusIndicator,
    },
    props: {
        network: Object,
        show_self_user_settings: Boolean,
    },
    data: function data() {
        return {
            newNick: '',
            error_message: '',
            self_user_settings_open: this.show_self_user_settings,
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
        awayStatus: {
            get() {
                return !!this.$state.getUser(this.network.id, this.network.nick).away;
            },
            set(val) {
                this.network.ircClient.raw('AWAY', val ? 'Currently away' : '');
            },
        },
    },
    watch: {
        show_self_user_settings: function watchSelfUserSettingsOpen() {
            this.self_user_settings_open = false;
        },
    },
    created() {
        this.listen(this.network.ircClient, 'nick in use', (event) => {
            this.error_message = `The nickname '${event.nick}' is already in use!`;
        });
    },
    methods: {
        openSelfActions(option) {
            this.self_user_settings_open = true;
        },
        closeSelfUser() {
            this.$emit('close');
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
            this.self_user_settings_open = false;
        },
        checkUserAway() {
            return !!this.$state.getUser(this.network.id, this.network.nick).away;
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
    padding-left: 13px;
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
    opacity: 0.6;
    cursor: pointer;
    line-height: 36px;
    transition: all 0.3s;
}

.kiwi-selfuser-nick i:hover {
    opacity: 1;
    transition: all 0.2s;
}

.kiwi-selfuser-nick i:last-of-type {
    margin-right: 10px;
}

.kiwi-selfuser-away-return-icon {
    position: absolute;
    left: 10px;
    top: 6px;
    font-size: 1em;
    cursor: pointer;
    z-index: 100;
}

.u-form .kiwi-selfuser-away-label {
    float: right;
    margin: 0 0 2px 0;
}

.u-form .kiwi-selfuser-away-label span {
    margin-right: 5px;
}

.u-form .kiwi-selfuser-away-label input[type='checkbox'] {
    float: right;
}

.kiwi-selfuser-error-message {
    width: 100%;
    display: block;
    padding: 0.5em 10px;
    background: #d16c6c;
    color: #fff;
    box-sizing: border-box;
    margin: 5px 0 5px 0;
    text-align: center;
    border-radius: 6px;
}

.kiwi-selfuser-actions {
    padding: 5px 10px;
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
    bottom: 5px;
    right: 5px;
    z-index: 1;
}

.kiwi-selfuser-actions form .u-input-button-container .u-button {
    padding: 3px 10px;
}

.kiwi-selfuser-actions .u-input {
    margin-bottom: 10px;
}

</style>
