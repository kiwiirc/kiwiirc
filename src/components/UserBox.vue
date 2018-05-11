<template>
    <div class="kiwi-userbox">

        <div class="kiwi-userbox-header">
            <i class="fa fa-user kiwi-userbox-icon" aria-hidden="true"></i>
            <h3>{{user.nick}}</h3>
            <div class="kiwi-userbox-usermask">{{user.username}}@{{user.host}}</div>
        </div>

        <div class="kiwi-userbox-basicinfo">
            <span class="kiwi-userbox-basicinfo-title">{{$t('whois_realname')}}:</span>
            <span class="kiwi-userbox-basicinfo-data">{{user.realname}} </span>
            <span class="kiwi-userbox-basicinfo-title">{{$t('whois_status')}}:</span>
            <span class="kiwi-userbox-basicinfo-data">{{user.away ? user.away : $t('whois_status_available')}}  </span>
        </div>

        <p class="kiwi-userbox-actions">
            <a @click="openQuery" class="kiwi-userbox-action">
                <i class="fa fa-comment-o" aria-hidden="true"></i>
                {{$t('send_a_message')}}
            </a>
            <a v-if="!whoisRequested" class="kiwi-userbox-action" @click="updateWhoisData">
                <i class="fa fa-question-circle" aria-hidden="true"></i>
                {{$t('more_information')}}
            </a>

            <form class="u-form kiwi-userbox-ignoreuser">
                <label>
                    <input type="checkbox" v-model="user.ignore" />
                    <span> {{$t('ignore_user')}} </span>
                </label>
            </form>
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

        <div v-if="buffer.isChannel() && areWeAnOp" class="kiwi-userbox-opactions">
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
                    <button @click="kickUser" class="u-button u-button-secondary kiwi-userbox-opaction-kick kiwi-userbox-opaction">
                        <i class="fa fa-sign-out" aria-hidden="true"></i>
                        {{$t('user_kick')}}
                    </button>
                </label>
                <label>
                    <button @click="banUser" class="u-button u-button-secondary kiwi-userbox-opaction-ban kiwi-userbox-opaction">
                        <i class="fa fa-ban" aria-hidden="true"></i>
                        {{$t('user_ban')}}
                    </button>
                </label>
                <label v-if="isUserOnBuffer">
                    <button @click="kickbanUser" class="u-button u-button-secondary kiwi-userbox-opaction-kickban kiwi-userbox-opaction">
                        <i class="fa fa-exclamation-triangle" aria-hidden="true"></i>
                        {{$t('user_kickban')}}
                    </button>
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
            state.$emit('userbox.hide');
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

<style lang="less">
.kiwi-sidebar-userbox {
    right: 0;
    width: 380px;
    max-width: none;
    height: 100%;
    overflow-y: scroll;
}

.kiwi-userbox {
    box-sizing: border-box;
}

.kiwi-userbox-header {
    position: relative;
    padding: 0.5em 1em 0.5em 5em;
    overflow: hidden;

    h3 {
        width: 100%;
        padding: 0;
        cursor: default;
    }
}

.fa-user.kiwi-userbox-icon {
    position: absolute;
    left: 0.5em;
    top: 0.25em;
    font-size: 3em;
}

.kiwi-userbox-usermask {
    width: 100%;
    cursor: default;
}

.kiwi-userbox-basicinfo {
    width: 100%;
    margin: 0;
    display: block;
    padding: 1em 1em 1em 1.4em;
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
    text-transform: capitalize;
    text-align: left;
    opacity: 0.5;
    font-weight: 900;
}

.kiwi-userbox-basicinfo-data {
    margin-bottom: 1em;
    font-weight: normal;
    font-weight: 100;
    opacity: 1;
}

.kiwi-userbox-actions {
    width: 100%;
    padding: 1em;
    text-align: center;
    margin: 0;
    box-sizing: border-box;

    .kiwi-userbox-action {
        display: inline-block;
        border: 1px solid #000;
        padding: 0.5em 1em;
        color: #000;
        cursor: pointer;
        margin: 0 auto 20px auto;
        transition: all 0.3s;
        border-radius: 3px;

        &:hover {
            background-color: #000;
            color: #fff;
        }
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

.kiwi-userbox-opactions {
    width: 100%;
    text-align: center;
    box-sizing: border-box;
    margin: 0 0 1em 0;
    border-top: 1px solid;
    padding: 1em;
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
    line-height: 2.8em;
    font-size: 1em;

    i {
        margin-right: 0.3em;
    }
}

.kiwi-userbox-actions a {
    margin-right: 1em;
}

.kiwi-userbox-whois {
    line-height: 1.4em;
    padding: 1em;
    width: 90%;
    margin: 0 5% 20px 5%;
    background: none;
    box-sizing: border-box;
}

.kiwi-userbox-whois-line {
    display: block;
}

.kiwi-userbox-ignoreuser {
    display: flex;
    flex-direction: row;
    justify-content: center;

    span {
        /* This fixes a vertical align issue between the checkbox and span */
        float: right;
    }
}

@media screen and (max-width: 769px) {
    .kiwi-container--sidebar-open .kiwi-sidebar-userbox {
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

    .kiwi-userbox .kiwi-userbox-header {
        padding-left: 10px;
    }

    .kiwi-userbox .kiwi-userbox-header i {
        display: none;
    }

    .kiwi-userbox .kiwi-userbox-basicinfo {
        padding: 10px 10px;
        margin-bottom: 20px;
    }

    .kiwi-userbox-actions {
        padding: 0;
        width: 100%;
        box-sizing: border-box;
    }

    .kiwi-userbox-actions .kiwi-userbox-action {
        width: 200px;
        clear: both;
        display: block;
    }
}
</style>
