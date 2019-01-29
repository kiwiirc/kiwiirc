/** @module */

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
        this.buffers = Object.create(null);
        this.account = '';
        this.hasWhois = false;

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
}
