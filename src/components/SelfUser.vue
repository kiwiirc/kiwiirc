<template>
    <div class="kiwi-selfuser kiwi-theme-bg">
        <div v-if="!self_user_settings_open" class="kiwi-selfuser-mask">
            <span class="kiwi-selfuser-nick">
                <away-status-indicator :network="network" :user="network.currentUser()" />
                {{ network.nick }}
                <i class="fa fa-times" aria-hidden="true" @click="closeSelfUser()" />
                <i class="fa fa-pencil" aria-hidden="true" @click="openSelfActions()" />
                <i
                    class="fa fa-user"
                    aria-hidden="true"
                    @click="openProfile()"
                />
            </span>
            <span class="kiwi-selfuser-host">
                {{ netUser.username }}@{{ netUser.host }} ( {{ modeString }} )
            </span>
            <div v-if="networkSupportsAway()" class="u-form kiwi-away-checkbox-form">
                <label class="kiwi-selfuser-away-label">
                    <span>{{ $t('away') }}</span>
                    <input v-model="awayStatus" type="checkbox">
                </label>
            </div>
        </div>
        <div v-else class="kiwi-selfuser-actions">
            <form
                class="u-form"
                @submit.prevent="changeNick"
                @keyup.esc="self_user_settings_open = false"
            >
                <input-prompt
                    v-focus
                    :label="$t('enter_new_nick')"
                    :noprompt="true"
                    :block="true"
                    @submit="onNewNickSubmit"
                    @cancel="self_user_settings_open = false"
                />
            </form>
            <div v-if="error_message" class="kiwi-selfuser-error-message">{{ error_message }}</div>
        </div>
    </div>
</template>

<script>

'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
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
            this.error_message = TextFormatting.t('error_nick_in_use', { nick: event.nick });
        });
    },
    methods: {
        openSelfActions() {
            this.self_user_settings_open = true;
        },
        openProfile() {
            this.$state.$emit('userbox.show', this.network.currentUser());
        },
        closeSelfUser() {
            this.$emit('close');
        },
        onNewNickSubmit(newVal) {
            this.new_nick = newVal;
            this.changeNick();
        },
        changeNick() {
            let nick = this.new_nick.trim();
            if (nick.length === 0) {
                this.error_message = TextFormatting.t('error_empty_nick');
                return;
            }
            if (nick.match(/(^[0-9])|(\s)/)) {
                this.error_message = TextFormatting.t('error_no_number');
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
    margin-right: 15px;
}

.kiwi-selfuser-nick i:hover {
    opacity: 1;
    transition: all 0.2s;
}

.kiwi-selfuser-nick i:first-of-type {
    margin-right: 0;
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
    margin-bottom: 10px;
}

.kiwi-selfuser-actions form {
    position: relative;
}

.kiwi-selfuser-actions form .u-input-prompt-label {
    display: block;
    width: 100%;
}

.kiwi-selfuser-actions .u-input-button-container {
    position: absolute;
    top: 2px;
    right: 2px;
    z-index: 1;
}

</style>
