/** @module */

import Vue from 'vue';
import * as ipRegex from 'ip-regex';
import * as IrcdDiffs from '@/helpers/IrcdDiffs';
import * as TextFormatting from '@/helpers/TextFormatting';
import { def } from './common';

export default class UserState {
    constructor(user) {
        this.nick = user.nick;
        this.host = user.host || '';
        this.username = user.username || '';
        this.realname = user.realname || '';
        this.modes = user.modes || '';
        this.away = user.away || '';
        this.colour = user.colour || '';
        this.account = user.account || '';
        this.buffers = Object.create(null);
        this.hasWhois = false;
        this.typingState = Object.create(null);
        this.avatar = user.avatar || { small: '', large: '' };
        this.ignore = false;

        Vue.observable(this);

        // Whois details are non-enumerable properties (vues $watch won't cover these properties)
        def(this, 'actual_host', '', true);
        def(this, 'helpop', '', true);
        def(this, 'bot', '', true);
        def(this, 'server', '', true);
        def(this, 'server_info', '', true);
        def(this, 'operator', '', true);
        def(this, 'channels', '', true);
        def(this, 'modes', '', true);
        def(this, 'idle', '', true);
        def(this, 'logon', '', true);
        def(this, 'registered_nick', '', true);
        def(this, 'secure', '', true);
        def(this, 'special', '', true);
    }

    getColour() {
        if (!this.colour) {
            this.colour = TextFormatting.createNickColour(this.nick);
        }
        // default will use the themes default text colour
        return this.colour === 'default' ? '' : this.colour;
    }

    isAway() {
        return !!this.away;
    }

    getBanMask() {
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
    }

    typingStatus(_target, status) {
        let target = _target.toLowerCase();
        if (!status) {
            return this.typingState[target] || { status: '' };
        }

        let typing = this.typingState[target];
        if (!typing) {
            Vue.set(this.typingState, target, { started: 0, status: '' });
            typing = this.typingState[target];
        }

        if (typing.timeout) {
            clearTimeout(typing.timeout);
            typing.timeout = null;
        }

        if (status === 'done') {
            Vue.delete(this.typingState, target);
            return null;
        }

        typing.started = Date.now();
        typing.status = status;

        // Paused state gets a longer timeout as it's usually someone stopping typing
        // to think about their words
        let timeoutLen = status === 'paused' ?
            30000 :
            6000;

        typing.timeout = setTimeout(() => this.typingStatus(target, 'done'), timeoutLen);

        return typing;
    }
}
