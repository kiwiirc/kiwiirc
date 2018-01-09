<template>
    <div class="kiwi-userbox">
        <div class="kiwi-userbox-header">
            <i class="fa fa-user kiwi-userbox-icon" aria-hidden="true"></i>
            <h3>{{user.nick}}</h3>
            <div class="kiwi-userbox-usermask">{{user.username}}@{{user.host}}</div>
        </div>

        <p class="kiwi-userbox-basicinfo">
            <b>{{$t('whois_realname')}}:</b> {{user.realname}} <br />
            <b>{{$t('whois_status')}}:</b> {{user.away ? user.away : $t('whois_status_available')}} <br />
        </p>

        <p class="kiwi-userbox-actions">
            <a @click="openQuery" class="u-link">{{$t('send_a_message')}}</a>
            <a v-if="!whoisRequested" class="u-link" @click="updateWhoisData">{{$t('more_information')}}</a> <br />
            <label>
                <input type="checkbox" v-model="user.ignore" /> {{$t('ignore_user')}}
            </label>
        </p>

        <div
            v-if="whoisRequested"
            class="kiwi-userbox-whois"
            v-bind:class="[whoisLoading?'kiwi-userbox-whois--loading':'']"
        >
            <template v-if="whoisLoading">
                <i class="fa fa-spinner" aria-hidden="true"></i>
            </template>
            <template v-else>
                <span class="kiwi-userbox-whois-line">{{user.away ? $t('whois_status') + ': ' + user.away : $t('whois_status_available')}}</span>
                <span class="kiwi-userbox-whois-line" v-if="user.account">{{$t('user_account', {user: user.account})}}</span>
                <span class="kiwi-userbox-whois-line">{{$t('user_realname', {realname: user.realname})}}</span>
                <span class="kiwi-userbox-whois-line" v-if="user.bot">{{$t('user_bot')}}</span>
                <span class="kiwi-userbox-whois-line" v-if="user.helpop">{{$t('user_help')}}</span>
                <span class="kiwi-userbox-whois-line" v-if="user.operator">{{$t('user_op')}}</span>
                <span class="kiwi-userbox-whois-line" v-if="user.server">{{$t('user_server', { server: user.server, info: (user.server_info ? `(${user.server_info})` : '')})}}</span>
                <span class="kiwi-userbox-whois-line" v-if="user.secure">{{$t('user_secure')}}</span>
                <span class="kiwi-userbox-whois-line" v-if="user.channels">{{$t('user_channels', {channels: user.channels})}}</span>
            </template>
        </div>

        <div v-if="buffer.isChannel() && areWeAnOp" class="kiwi-userbox-actions-op">
            <form class="u-form" @submit.prevent="">
                <label v-if="isUserOnBuffer">
                    {{$t('user_access')}} <select v-model="userMode">
                        <option v-for="mode in availableChannelModes" v-bind:value="mode.mode">
                            {{mode.description}}
                        </option>
                        <option value="">{{$t('user_normal')}}</option>
                    </select>
                </label>
                <label v-if="isUserOnBuffer">
                    <button @click="kickUser" class="u-button u-button-secondary">{{$t('user_kick')}}</button>
                </label>
                <label>
                    <button @click="banUser" class="u-button u-button-secondary">{{$t('user_ban')}}</button>
                </label>
                <label v-if="isUserOnBuffer">
                    <button @click="kickbanUser" class="u-button u-button-secondary">{{$t('user_kickban')}}</button>
                </label>
            </form>
        </div>
    </div>
</template>

<script>

import state from '@/libs/state';

export default {
    data: function data() {
        return {
            whoisRequested: false,
            whoisLoading: false,
        };
    },
    props: ['buffer', 'network', 'user'],
    computed: {
        // Channel modes differ on some IRCds so get them from the network options
        availableChannelModes: function availableChannelModes() {
            let availableModes = [];
            let prefixes = this.network.ircClient.network.options.PREFIX;
            // TODO: Double check these modes mean the correct things
            let knownPrefix = {
                q: 'Owner',
                a: 'Admin',
                o: 'Operator',
                h: 'Half-Operator',
                v: 'Voice',
            };
            prefixes.forEach(prefix => {
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
            let buffer = state.addBuffer(this.network.id, this.user.nick);
            state.setActiveBuffer(this.network.id, buffer.name);
        },
        updateWhoisData: function updateWhoisData() {
            this.whoisRequested = true;
            this.whoisLoading = true;
            this.network.ircClient.whois(this.user.nick, () => {
                this.whoisLoading = false;
            });
        },
        kickUser: function kickUser() {
            let reason = state.setting('buffers.default_kick_reason');
            this.network.ircClient.raw('KICK', this.buffer.name, this.user.nick, reason);
        },
        createBanMask: function banMask() {
            let mask = state.setting('buffers.default_ban_mask');
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
            let reason = state.setting('buffers.default_kick_reason');
            this.network.ircClient.raw('MODE', this.buffer.name, '+b', banMask);
            this.network.ircClient.raw('KICK', this.buffer.name, this.user.nick, reason);
        },
        maybeRepositionTop: function maybeRepositionTop() {
            let rect = this.$el.getBoundingClientRect();
            // $el may be in the middle of a transition still, making rect.top/rect.bottom
            // the current position of the transition and not where it will be after the
            // transition has ended. So read the top property directly from its style.
            let targetTop = parseInt((this.$el.style.top || '').replace('px', ''), 10);

            if (targetTop + rect.height > window.innerHeight) {
                this.$el.style.top = (window.innerHeight - rect.height) + 'px';
            }
        },
    },
    mounted: function mounted() {
        this.maybeRepositionTop();
    },
    updated: function updated() {
        this.maybeRepositionTop();
    },
    watch: {
        user: function watchUser() {
            // Reset the whois view since the user is now different
            this.whoisRequested = false;
            this.whoisLoading = false;
        },
    },
};

</script>

<style>
.kiwi-userbox {
    box-sizing: border-box;
    padding: 10px;
}
@media screen and (max-width: 500px) {
    .kiwi-userbox {
        left: 0;
        right: 0;
        bottom: 40px;
        top: auto !important;
        max-width: 100%;
        border-width: 1px 0;
    }
}
.kiwi-userbox-icon {
    font-size: 2.8em;
    margin-right: 0.3em;
    position: absolute;
}
.kiwi-userbox-header h3 {
    margin: 0 0 0 40px;
    padding: 0;
}
.kiwi-userbox-usermask {
    display: block;
    margin: 0 0 0 40px;
    font-size: 0.9em;
}
.kiwi-userbox-actions a {
    margin-right: 1em;
}
.kiwi-userbox-whois {
    padding: 5px;
    line-height: 1.4em;
}
.kiwi-userbox-whois-line {
    display: block;
}
.kiwi-userbox-actions-op {
    margin: 0.7em 0 0 0;
    padding: 0.7em 0;
}
.kiwi-userbox-actions-op form label {
    display: block;
    margin-bottom: 0.7em;
}
</style>
