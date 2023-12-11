/** @module */

import Vue from 'vue';
import getState from '@/libs/state';
import * as TextFormatting from '@/helpers/TextFormatting';
import { def } from './common';

let nextId = 0;

export default class UserState {
    constructor(user) {
        this.id = ++nextId;
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

    isAway() {
        return this.away && this.away !== 'offline';
    }

    isOffline() {
        return this.away === 'offline';
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
