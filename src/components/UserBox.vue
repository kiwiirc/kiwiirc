<template>
    <div class="kiwi-userbox">
        <span v-if="isSelf" class="kiwi-userbox-selfprofile">
            {{ $t('user_you') }}
        </span>
        <div class="kiwi-userbox-header">
            <div class="kiwi-userbox-avatar">
                <avatar :user="user" size="large" />
                <away-status-indicator :network="network" :user="user" />
            </div>
            <div class="kiwi-userbox-userinfo">
                <span
                    class="kiwi-userbox-nick"
                    :style="{ 'color': user.getColour() }"
                >{{ user.nick }}</span>
                <span v-if="userMode" class="kiwi-userbox-modestring">+{{ userMode }}</span>
                <span class="kiwi-userbox-usermask">{{ user.username }}@{{ user.host }}</span>
            </div>
        </div>

        <div v-if="realname" class="kiwi-userbox-basicinfo">
            <span class="kiwi-userbox-basicinfo-title">{{ $t('whois_realname') }}:</span>
            <span class="kiwi-userbox-basicinfo-data" v-html="formattedRealname" />
        </div>

        <div class="kiwi-userbox-actions">
            <a v-if="!isSelf && !buffer.isQuery()" class="kiwi-userbox-action" @click="openQuery">
                <i class="fa fa-comment-o" aria-hidden="true" />
                {{ $t('send_a_message') }}
            </a>
            <a v-if="!whoisRequested" class="kiwi-userbox-action" @click="updateWhoisData">
                <i class="fa fa-question-circle" aria-hidden="true" />
                {{ $t('more_information') }}
            </a>
            <div class="kiwi-userbox-actions kiwi-userbox-plugin-actions">
                <div
                    v-for="plugin in pluginUiButtonElements"
                    :key="plugin.id"
                    v-rawElement="{
                        el: plugin.el,
                        props: {
                            kiwi: {
                                user: user,
                                userbox: self,
                            }
                        }
                    }"
                />
            </div>
        </div>

        <form v-if="!isSelf" class="u-form kiwi-userbox-ignoreuser">
            <label>
                <input v-model="user.ignore" type="checkbox">
                <span> {{ $t('ignore_user') }} </span>
            </label>
        </form>

        <div
            v-if="whoisRequested"
            :class="[whoisLoading?'kiwi-userbox-whois--loading':'']"
            class="kiwi-userbox-whois"
        >
            <template v-if="whoisLoading">
                <i class="fa fa-spinner" aria-hidden="true" />
            </template>
            <template v-else>
                <span class="kiwi-userbox-whois-line">
                    {{ user.away ?
                        $t('whois_status') + ': ' + user.away :
                        $t('whois_status_available')
                    }}
                </span>
                <span v-if="user.account" class="kiwi-userbox-whois-line">
                    {{ $t('user_account', {user: user.account}) }}
                </span>
                <span class="kiwi-userbox-whois-line">
                    {{ $t('user_realname', {realname: user.realname}) }}
                </span>
                <span v-if="user.bot" class="kiwi-userbox-whois-line">{{ $t('user_bot') }}</span>
                <span v-if="user.helpop" class="kiwi-userbox-whois-line">
                    {{ $t('user_help') }}
                </span>
                <span v-if="user.operator" class="kiwi-userbox-whois-line">
                    {{ $t('user_op') }}
                </span>
                <span v-if="user.server" class="kiwi-userbox-whois-line">
                    {{ $t('user_server', {
                        server: user.server,
                        info: (user.server_info ? `(${user.server_info})` : '')
                    }) }}
                </span>
                <span v-if="user.secure" class="kiwi-userbox-whois-line">
                    {{ $t('user_secure') }}
                </span>
                <span
                    v-if="user.channels"
                    class="kiwi-userbox-whois-line"
                    @click="onChannelsClick($event)"
                    v-html="$t('user_channels', {channels: userChannels})"
                />
            </template>
        </div>

        <div v-if="buffer.isChannel() && areWeAnOp && !isSelf" class="kiwi-userbox-opactions">
            <form class="u-form" @submit.prevent="">
                <label v-if="isUserOnBuffer">
                    {{ $t('user_access') }} <select v-model="userMode">
                        <option
                            v-for="mode in availableChannelModes"
                            :key="mode.mode"
                            :value="mode.mode"
                        >
                            {{ mode.description }}
                        </option>
                        <option value="">{{ $t('user_normal') }}</option>
                    </select>
                </label>
                <label v-if="isUserOnBuffer">
                    <button
                        type="button"
                        class="u-button u-button-secondary
                               kiwi-userbox-opaction-kick kiwi-userbox-opaction"
                        @click="kickUser"
                    >
                        <i class="fa fa-sign-out" aria-hidden="true" />
                        {{ $t('user_kick') }}
                    </button>
                </label>
                <label>
                    <button
                        type="button"
                        class="u-button u-button-secondary
                               kiwi-userbox-opaction-ban kiwi-userbox-opaction"
                        @click="banUser"
                    >
                        <i class="fa fa-ban" aria-hidden="true" />
                        {{ $t('user_ban') }}
                    </button>
                </label>
                <label v-if="isUserOnBuffer">
                    <button
                        type="button"
                        class="u-button u-button-secondary
                               kiwi-userbox-opaction-kickban kiwi-userbox-opaction"
                        @click="kickbanUser"
                    >
                        <i class="fa fa-exclamation-triangle" aria-hidden="true" />
                        {{ $t('user_kickban') }}
                    </button>
                </label>
            </form>
        </div>
    </div>
</template>

<script>

'kiwi public';

import * as ipRegex from 'ip-regex';
import * as TextFormatting from '@/helpers/TextFormatting';
import * as IrcdDiffs from '@/helpers/IrcdDiffs';
import GlobalApi from '@/libs/GlobalApi';
import toHtml from '@/libs/renderers/Html';
import parseMessage from '@/libs/MessageParser';
import Avatar from './Avatar';
import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        Avatar,
        AwayStatusIndicator,
    },
    props: ['buffer', 'network', 'user'],
    data: function data() {
        return {
            self: this,
            whoisRequested: false,
            whoisLoading: false,
            pluginUiButtonElements: GlobalApi.singleton().userboxButtonPlugins,
        };
    },
    computed: {
        // Channel modes differ on some IRCds so get them from the network options
        availableChannelModes: function availableChannelModes() {
            let availableModes = [];
            let prefixes = this.network.ircClient.network.options.PREFIX;
            let knownPrefix = {
                q: 'Owner',
                a: 'Admin',
                o: 'Operator',
                h: 'Half-Operator',
                v: 'Voice',
            };

            prefixes.forEach((prefix) => {
                let mode = prefix.mode;
                if (knownPrefix[mode]) {
                    availableModes.push({
                        mode: mode,
                        description: knownPrefix[mode],
                    });
                }
            });

            return availableModes;
        },
        areWeAnOp: function areWeAnOp() {
            if (!this.buffer) {
                return false;
            }

            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
        realname() {
            return (this.user.realname || '').trim();
        },
        formattedRealname() {
            let blocks = parseMessage(this.realname, { extras: false });
            let content = toHtml(blocks, false);
            return content;
        },
        isUserOnBuffer: function isUserOnBuffer() {
            if (!this.buffer) {
                return false;
            }

            if (!this.user.buffers[this.buffer.id]) {
                // Probably switched buffer while the userbox was open
                return false;
            }

            return true;
        },
        userMode: {
            get: function getUserMode() {
                if (!this.buffer) {
                    return '';
                }

                let userBufferInfo = this.user.buffers[this.buffer.id];
                if (!userBufferInfo) {
                    // Probably switched buffer while the userbox was open
                    return '';
                }

                let modes = userBufferInfo.modes;
                return modes.length > 0 ?
                    modes[0] :
                    '';
            },
            // Switch the current user mode for the new one
            set: function setUserMode(newVal) {
                let client = this.network.ircClient;
                let oldVal = this.userMode;

                let changes = [];
                let targets = [];

                if (oldVal) {
                    changes.push('-' + oldVal);
                    targets.push(this.user.nick);
                }
                if (newVal) {
                    changes.push('+' + newVal);
                    targets.push(this.user.nick);
                }

                let params = ['MODE', this.buffer.name, changes.join('')].concat(targets);
                client.raw(params);
            },
        },
        userChannels() {
            let channels = this.user.channels.trim().split(' ');
            for (let i = 0; i < channels.length; i++) {
                channels[i] = TextFormatting.linkifyChannels(channels[i]);
            }
            return channels.join(' ');
        },
        isSelf() {
            return this.user === this.network.currentUser();
        },
    },
    watch: {
        user: function watchUser() {
            // Reset the whois view since the user is now different
            this.whoisRequested = false;
            this.whoisLoading = false;
        },
    },
    methods: {
        userModeOnThisBuffer: function userModeOnBuffer(user) {
            if (!this.buffer) {
                return '';
            }

            let userBufferInfo = user.buffers[this.buffer.id];
            let modes = userBufferInfo.modes;
            return modes.length > 0 ?
                modes[0] :
                '';
        },
        openQuery: function openQuery() {
            let buffer = this.$state.addBuffer(this.network.id, this.user.nick);
            this.$state.setActiveBuffer(this.network.id, buffer.name);
            if (this.$state.ui.is_narrow) {
                this.$state.$emit('userbox.hide');
            }
        },
        onChannelsClick(event) {
            let channelName = event.target.getAttribute('data-channel-name');
            if (channelName) {
                let network = this.buffer.getNetwork();
                this.$state.addBuffer(this.buffer.networkid, channelName);
                network.ircClient.join(channelName);
            }
        },
        updateWhoisData: function updateWhoisData() {
            this.whoisRequested = true;
            this.whoisLoading = true;
            this.network.ircClient.whois(this.user.nick, () => {
                this.whoisLoading = false;
            });
        },
        kickUser: function kickUser() {
            let reason = this.$state.setting('buffers.default_kick_reason');
            this.network.ircClient.raw('KICK', this.buffer.name, this.user.nick, reason);
        },
        createBanMask: function createBanMask() {
            // try to ban via user account first
            if (this.user.account) {
                // if EXTBAN is supported use that
                let extban = IrcdDiffs.extbanAccount(this.network);
                if (extban) {
                    return extban + ':' + this.user.account;
                }

                // if the account name is in the host ban the host
                // Eg. user@network/user/accountname
                if (this.user.host.toLowerCase().indexOf(this.user.account.toLowerCase()) > -1) {
                    return '*!*@' + this.user.host;
                }
            }

            // if an ip address is in the host and not the whole host ban the ip
            // Eg. user@gateway/1.2.3.4
            let ipTest = new RegExp('(' + ipRegex.v4().source + '|' + ipRegex.v6().source + ')');
            if (ipTest.test(this.user.host)) {
                let match = this.user.host.match(ipTest)[0];
                if (match !== this.user.host) {
                    return '*!*@*' + match + '*';
                }
            }

            // if an 8 char hex is the username ban by username. Commonly used in gateways
            // Eg. 59d4c432@a.clients.kiwiirc.com
            let hexTest = /^([a-f0-9]{8})$/i;
            if (hexTest.test(this.user.username)) {
                let match = this.user.username.match(hexTest)[0];
                return '*!' + match + '@*';
            }

            // fallback to default_ban_mask from config
            let mask = this.$state.setting('buffers.default_ban_mask');
            mask = mask.replace('%n', this.user.nick);
            mask = mask.replace('%i', this.user.username);
            mask = mask.replace('%h', this.user.host);

            return mask;
        },
        banUser: function banUser() {
            if (!this.user.username || !this.user.host) {
                return;
            }

            let banMask = this.createBanMask();
            this.network.ircClient.raw('MODE', this.buffer.name, '+b', banMask);
        },
        kickbanUser: function kickbanuser() {
            if (!this.user.username || !this.user.host) {
                return;
            }

            let banMask = this.createBanMask();
            let reason = this.$state.setting('buffers.default_kick_reason');
            this.network.ircClient.raw('MODE', this.buffer.name, '+b', banMask);
            this.network.ircClient.raw('KICK', this.buffer.name, this.user.nick, reason);
        },
    },
};
</script>

<style lang="less">
.kiwi-sidebar.kiwi-sidebar-section-user {
    right: 0;
    width: 380px;
}

.kiwi-userbox {
    box-sizing: border-box;
    overflow-y: auto;
    height: 100%;
}

.kiwi-userbox-selfprofile {
    display: block;
    margin: 0 auto;
    width: 100%;
    padding: 1em;
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
}

.kiwi-userbox-header {
    position: relative;
    padding: 0.5em;
    box-sizing: border-box;
    display: flex;
}

.kiwi-userbox-avatar {
    position: relative;
    margin: 1em;
    width: 100px;
    height: 100px;
    flex-shrink: 0;
}

.kiwi-userbox-avatar .kiwi-avatar-inner {
    font-size: 3em;
    border-width: 3px;
}

.kiwi-userbox-avatar .kiwi-awaystatusindicator {
    width: 16px;
    height: 16px;
    top: 4px;
    right: 2px;
    position: absolute;
}

.kiwi-userbox-userinfo {
    box-sizing: border-box;
    margin-top: 1.2em;
    flex-grow: 1;
}

.kiwi-userbox-nick {
    font-weight: 800;
    font-size: 1.4em;
}

.kiwi-userbox-modestring {
    font-weight: normal;
    font-size: 0.8em;
    margin-left: 6px;
}

.kiwi-userbox-usermask {
    display: block;
    opacity: 0.6;
    cursor: default;
    word-break: break-all;
    padding-left: 1px;
}

.fa-user.kiwi-userbox-icon {
    display: inline-block;
    font-size: 2em;
}

.kiwi-userbox-basicinfo {
    width: 100%;
    display: block;
    padding: 0 1.5em 0.5em 1.5em;
    box-sizing: border-box;
}

.kiwi-userbox-basicinfo-title,
.kiwi-userbox-basicinfo-data {
    display: block;
    width: 100%;
    cursor: default;
    margin: 0;
}

.kiwi-userbox-basicinfo-title {
    font-size: 1em;
    line-height: 1em;
    padding: 0;
    font-weight: 900;
}

.kiwi-userbox-basicinfo-data {
    font-weight: normal;
    font-weight: 100;
    opacity: 1;
}

.kiwi-userbox-actions {
    width: 100%;
    padding: 0.5em;
    text-align: center;
    user-select: none;
    box-sizing: border-box;

    /* using display flex here to prevent spaces making things uneven */
    display: flex;
    flex-wrap: wrap;
    justify-content: center;

    .kiwi-userbox-action {
        border: 1px solid;
        padding: 0.5em 1em;
        cursor: pointer;
        margin: 0.5em;
        transition: all 0.3s;
        border-radius: 3px;
    }

    .kiwi-userbox-action:empty {
        display: none;
    }

    label {
        display: block;
        cursor: pointer;

        span {
            text-align: left;
            width: auto;
        }
    }
}

.kiwi-userbox-plugin-actions {
    padding: 0;
}

.kiwi-userbox-opactions {
    width: 100%;
    text-align: center;
    box-sizing: border-box;
    margin: 0 0 1em 0;
    border-top: 1px solid;
    padding: 1em 1.5em;
}

.kiwi-userbox-opactions label {
    width: 100%;
    font-size: 1.2em;
    font-weight: 600;
    display: block;
    margin-bottom: 0.7em;
}

.kiwi-userbox-opactions label select {
    display: block;
    clear: both;
    padding: 10px;
    border-radius: 0.25em;
    box-shadow: none;
    border: 1px solid;
    width: 100%;
    margin-top: 10px;
    cursor: pointer;
}

.kiwi-userbox-opaction {
    width: 100%;
    padding: 0 1em;
    text-align: left;
    border: none;
    line-height: 2.2em;
    font-size: 0.8em;
}

.kiwi-userbox-opaction i {
    margin-right: 0.2em;
    font-size: 1.2em;
}

.kiwi-userbox-whois {
    line-height: 1.4em;
    padding: 1em;
    margin: 0 1em 1em 1em;
    background: none;
    box-sizing: border-box;
    border-radius: 1em;
}

.kiwi-userbox-whois-line {
    display: block;
}

.kiwi-userbox-ignoreuser {
    display: flex;
    flex-direction: row;
    justify-content: center;
}

.kiwi-userbox-ignoreuser label {
    margin: 0 0 1em 0;
}

.kiwi-userbox-ignoreuser span {
    /* This fixes a vertical align issue between the checkbox and span */
    float: right;
}

@media screen and (max-width: 769px) {
    .kiwi-container--sidebar-drawn .kiwi-sidebar-userbox {
        width: 100%;
    }

    .kiwi-userbox {
        left: 0;
        right: 0;
        bottom: 40px;
        top: auto;
        max-width: 100%;
        border-width: 1px 0;
    }

    .kiwi-userbox .kiwi-userbox-header i {
        display: none;
    }

    .kiwi-userbox-actions {
        width: 100%;
        box-sizing: border-box;
    }

    .kiwi-userbox-plugin-actions {
        padding: 0;
    }

    .kiwi-userbox-actions .kiwi-userbox-action {
        width: 66%;
        clear: both;
        display: block;
    }
}
</style>
