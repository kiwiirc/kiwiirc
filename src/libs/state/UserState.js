/** @module */

import Vue from 'vue';
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

    typingStatus(target, status) {
        if (!this.typingState[target.toLowerCase()]) {
            Vue.set(this.typingState, target.toLowerCase(), { started: 0, status: '' });
        }

        let typing = this.typingState[target.toLowerCase()];

        if (!status) {
            return this.typingState[target.toLowerCase()] || { status: '' };
        }

        if (typing.timeout) {
            clearTimeout(typing.timeout);
            typing.timeout = null;
        }

        if (status === 'done') {
            Vue.delete(this.typingState, target.toLowerCase());
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
