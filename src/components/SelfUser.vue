<template>
    <div class="kiwi-selfuser kiwi-theme-bg">
        <div v-if="!self_user_settings_open" class="kiwi-selfuser-mask">
            <span class="kiwi-selfuser-nick">
                <away-status-indicator :network="network" :user="network.currentUser()"/>
                {{ network.nick }}
                <i class="fa fa-times" aria-hidden="true" @click="closeSelfUser()"/>
                <i class="fa fa-pencil" aria-hidden="true" @click="openSelfActions()" />
            </span>
            <span class="kiwi-selfuser-host">
                {{ netUser.username }}@{{ netUser.host }} ( {{ modeString }} )
            </span>
            <div v-if="networkSupportsAway()" class="u-form kiwi-away-checkbox-form">
                <label class="kiwi-selfuser-away-label">
                    <span>Away</span>
                    <input v-model="awayStatus" type="checkbox" >
                </label>
            </div>
        </div>
        <div v-else class="kiwi-selfuser-actions">
            <div class="kiwi-selfuser-away-return-icon" @click="self_user_settings_open = false">
                <i class="fa fa-times" aria-hidden="true"/>
            </div>
            <form
                class="u-form"
                @submit.prevent="changeNick"
                @keyup.esc="self_user_settings_open = false"
            >
                <input v-focus
                       v-model="new_nick"
                       type="text"
                       class="u-input"
                       placeholder="Enter new nickname..."
                >
                <span class="u-input-button-container">
                    <a class="u-button u-button-primary" @click="changeNick">
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
    },
    data: function data() {
        return {
            new_nick: '',
            error_message: '',
            self_user_settings_open: false,
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
        awayStatus: {
            get() {
                return this.network.currentUser().away;
            },
            set(val) {
                this.network.ircClient.raw('AWAY', val ? 'Currently away' : '');
            },
        },
    },
    created() {
        this.listen(this.network.ircClient, 'nick in use', (event) => {
            this.error_message = `The nickname '${event.nick}' is already in use!`;
        });
    },
    methods: {
        openSelfActions() {
            this.self_user_settings_open = true;
        },
        closeSelfUser() {
            this.$emit('close');
        },
        changeNick() {
            let nick = this.new_nick.trim();
            if (nick.length === 0) {
                this.error_message = 'You must enter a new username';
                return;
            }
            if (nick.match(/(^[0-9])|(\s)/)) {
                this.error_message = 'Username must not start with a number';
                return;
            }
            this.error_message = '';
            this.network.ircClient.changeNick(nick);
            this.userNameCancel();
        },
        userNameCancel() {
            this.self_user_settings_open = false;
        },
        networkSupportsAway() {
            return this.network.ircClient.network.cap.isEnabled('away-notify');
        },
        checkUserAway() {
            return !!this.network.currentUser().away;
        },
        getUserFromString(name) {
            return this.$state.getUser(this.network.id, name);
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
    cursor: default;
    width: 100%;
    box-sizing: border-box;
}

.kiwi-selfuser-nick {
    min-width: 85px;
    font-weight: bold;
    padding: 5px 10px 0 10px;
}

.kiwi-selfuser-modes {
    font-weight: normal;
    opacity: 0.8;
    font-size: 0.8em;
}

.kiwi-selfuser-host {
    font-style: italic;
    opacity: 0.8;
    padding-left: 26px;
    font-size: 0.8em;
    word-break: break-all;
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
    margin-top: 3px;
    transition: all 0.3s;
}

.kiwi-selfuser-nick i:hover {
    opacity: 1;
    transition: all 0.2s;
}

.kiwi-selfuser-nick i:last-of-type {
    margin-right: 15px;
}

.kiwi-selfuser-away-return-icon {
    position: absolute;
    opacity: 0.6;
    right: 15px;
    top: 15px;
    font-size: 1em;
    cursor: pointer;
    z-index: 100;
    transition: all 0.2s;
}

.kiwi-selfuser-away-return-icon:hover {
    opacity: 1;
}

.u-form.kiwi-away-checkbox-form {
    padding: 0 0 5px 24px;
}

.u-form .kiwi-selfuser-away-label {
    margin: 0 0 2px 0;
}

.u-form .kiwi-selfuser-away-label span {
    margin-right: 5px;
}

.kiwi-selfuser-error-message {
    width: 100%;
    display: block;
    padding: 0.5em 10px;
    box-sizing: border-box;
    margin: 5px 0 5px 0;
    text-align: center;
    border-radius: 6px;
}

.kiwi-selfuser-actions {
    padding: 5px 10px;
}

.kiwi-selfuser-actions form {
    width: calc(100% - 30px);
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
