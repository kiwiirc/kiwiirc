/** @module */

import Vue from 'vue';
import ipRegex from 'ip-regex';
import getState from '@/libs/state';
import * as IrcdDiffs from '@/helpers/IrcdDiffs';
import * as TextFormatting from '@/helpers/TextFormatting';
import { def } from './common';

let nextId = 0;

export default class UserState {
    constructor(networkid, user, state) {
        this.id = ++nextId;
        this.networkid = networkid;
        this.key = user.nick.toUpperCase();
        this.nick = user.nick;
        this.host = user.host || '';
        this.username = user.username || '';
        this.realname = user.realname || '';
        this.modes = user.modes || [];
        this.away = user.away || '';
        this.colour = user.colour || '';
        this.account = user.account || '';
        this.buffers = Object.create(null);
        this.hasWhois = false;
        this.hasWhoFlags = false;
        this.typingState = Object.create(null);
        this.ignore = false;

        this.avatarCache = null;

        Vue.observable(this);

        def(this, 'state', state, false);

        // Whois details are non-enumerable properties (vues $watch won't cover these properties)
        // watch hasWhois to know when this data is populated
        def(this, 'whois', {
            actual_ip: '',
            actual_username: '',
            actual_hostname: '',
            helpop: '',
            bot: '',
            server: '',
            server_info: '',
            operator: '',
            channels: '',
            modes: '',
            idle: '',
            logon: '',
            registered_nick: '',
            secure: '',
            special: '',
        }, true);

        // Who flags are non-enumerable properties (vues $watch won't cover these properties)
        // watch hasWhoFlags to know when this data is populated
        def(this, 'whoFlags', {
            bot: null,
            operator: null,
            registered: null,
            secure: null,
        }, true);
    }

    get avatar() {
        if (!this.avatarCache) {
            this.avatar = { small: '', large: '' };
            getState().$emit('user.avatar.create', { user: this });
        }
        return this.avatarCache;
    }

    set avatar(value) {
        this.avatarCache = value;
    }

    getColour() {
        if (!this.colour) {
            this.colour = TextFormatting.createNickColour(this.nick);
        }
        // default will use the themes default text colour
        return this.colour === 'default' ? '' : this.colour;
    }

    getNetwork() {
        return this.state.getNetwork(this.networkid);
    }

    isAway() {
        return this.away && this.away !== 'offline';
    }

    isOffline() {
        return this.away === 'offline';
    }

    createBanMask() {
        // try to ban via user account first
        if (this.account) {
            // if EXTBAN is supported use that
            let extban = IrcdDiffs.extbanAccount(this.getNetwork());
            if (extban) {
                return extban + ':' + this.account;
            }

            // if the account name is in the host ban the host
            // Eg. user@network/user/accountname
            if (this.host.toLowerCase().indexOf(this.account.toLowerCase()) > -1) {
                return '*!*@' + this.host;
            }
        }

        // if an ip address is in the host and not the whole host ban the ip
        // Eg. user@gateway/1.2.3.4
        let ipTest = new RegExp('(' + ipRegex.v4().source + '|' + ipRegex.v6().source + ')');
        if (ipTest.test(this.host)) {
            let match = this.host.match(ipTest)[0];
            if (match !== this.host) {
                return '*!*@*' + match + '*';
            }
        }

        // if an 8 char hex is the username ban by username. Commonly used in gateways
        // Eg. 59d4c432@a.clients.kiwiirc.com
        let hexTest = /^([a-f0-9]{8})$/i;
        if (hexTest.test(this.username)) {
            let match = this.username.match(hexTest)[0];
            return '*!' + match + '@*';
        }

        // fallback to default_ban_mask from config
        let mask = this.state.setting('buffers.default_ban_mask');
        mask = mask.replace('%n', this.nick);
        mask = mask.replace('%i', this.username);
        mask = mask.replace('%h', this.host);

        return mask;
    }

    typingStatus(_target, status) {
        let target = _target.toUpperCase();
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
