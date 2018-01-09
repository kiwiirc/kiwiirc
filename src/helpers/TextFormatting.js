import _ from 'lodash';
import * as Colours from './Colours';
import { md5 } from './Md5';
import ThemeManager from '@/libs/ThemeManager';

const urlRegex = new RegExp(
    // Detect either a protocol or 'www.' to start a URL
    /(([A-Za-z][A-Za-z0-9-]*:\/\/)|(www\.))/.source +
    // The hostname..
    /([\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF.-]+)/.source +
    // The hostname must end in 2-6 alpha characters (the TLD)
    /([a-zA-Z]{2,6})/.source +
    // Optional port..
    /(:[0-9]+)?/.source +
    // Optional path..
    /(\/[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF!:.?$'()[\]*,;~+=&%@!\-/]*)?/.source +
    // Optional fragment
    /(#.*)?/.source,
    'i'
);

export function linkifyUrls(input, _opts) {
    let opts = _opts || {};
    let foundUrls = [];
    let urls = Object.create(null);
    let result = input.replace(urlRegex, _url => {
        let url = _url;
        let nice = '';
        let suffix = '';

        // Don't allow javascript execution
        if (url.match(/^javascript:/i)) {
            return url;
        }

        // Add the http if no protoocol was found
        if (url.match(/^www\./i)) {
            url = 'http://' + url;
        }

        // Links almost always contain an opening bracket if the last character is a closing
        // bracket and should be part of the URL.
        // If there isn't an opening bracket but the URL ends in a closing bracket, consider the
        // closing bracket as punctuation outside of the URL.
        if (url.indexOf('(') === -1 && url[url.length - 1] === ')') {
            suffix += ')';
            url = url.substr(0, url.length - 1);
        }

        nice = url;

        // Shorten the displayed URL if it's going to be too long
        if (nice.length > 100) {
            nice = nice.substr(0, 100) + '...';
        }

        // Make the link clickable
        let out = `<a target="_blank" href="${url.replace(/"/g, '%22')}">${_.escape(nice)}</a>`;

        if (opts.addHandle) {
            let cssClass = opts.handleClass || '';
            let content = opts.handleContent || '';
            out += `<a data-url="${url}" class="${cssClass}">${content}</a>`;
        }

        // Pretty hacky, but replace all URLs with random keys that won't get caught up in the HTML
        // escaping. Once escaped, replace the random keys back with the URL links.
        let urlId = '---url' + (Math.random() * 1e+17) + '---';
        urls[urlId] = out;
        out = urlId;

        foundUrls.push(url);
        return out + suffix;
    });

    // Replace the random URL keys back with their URL links
    result = _.escape(result);
    Object.keys(urls).forEach(urlId => {
        result = result.replace(urlId, urls[urlId]);
    });

    return {
        urls: foundUrls,
        html: result,
    };
}

export function addEmojis(wordCtx, emojiList, emojiLocation) {
    let word = '';
    let words = [word];

    // wordCtx may be an object with extra context about the word
    if (typeof wordCtx === 'object') {
        word = wordCtx.word;
        words = wordCtx.words;
    } else {
        word = wordCtx;
    }

    // If emojiList.hasOwnProperty exists then use it to check that the word
    // is actually part of the object
    if (emojiList.hasOwnProperty && !emojiList.hasOwnProperty(word)) {
        return word;
    }

    let emoji = emojiList[word];
    if (emoji) {
        let classes = 'kiwi-messagelist-emoji';
        if (_.compact(words).length === 1) {
            classes += ' kiwi-messagelist-emoji--single';
        }

        let src = `${emojiLocation}${emoji}.png`;
        return `<img class="${classes}" src="${src}" alt="${word}" />`;
    }

    return word;
}

const channelMatch = /(^|\s|[@+~&%}]+)([#&][^ .,\007<>\n\r]+)([.,<>\n\r]+)?$/i;
export function linkifyChannels(word) {
    // "@#kiwiirc," = 3 parts. (prefix=@)(channel=#kiwiirc)(suffix=,)
    return word.replace(channelMatch, (match, mPrefix, mChannel, mSuffix) => {
        let chan = _.escape(mChannel.trim());
        let prefix = _.escape(mPrefix);
        let suffix = _.escape(mSuffix);

        let link = `<a class="u-link kiwi-channel" data-channel-name="${chan}">${chan}</a>`;
        return `${prefix}${link}${suffix}`;
    });
}

export function linkifyUsers(word, userlist) {
    let ret = '';
    let nick = '';
    let prepend = '';
    let append = '';
    let punc = ',.!:;-+)]?¿\\/<>@';
    let validLastChar = punc.indexOf(word[word.length - 1]) > -1;
    let normWord = word.toLowerCase();
    let hasProp = Object.prototype.hasOwnProperty;

    // Checking for a nick in order of processing cost
    if (hasProp.call(userlist, normWord)) {
        nick = word;
    } else if (hasProp.call(userlist, normWord.substr(0, normWord.length - 1)) && validLastChar) {
        // The last character is usually punctuation of some kind
        nick = word.substr(0, word.length - 1);
        append = word[word.length - 1];
    } else if (hasProp.call(userlist, _.trim(normWord, punc))) {
        nick = _.trim(word, punc);
        let nickIdx = word.indexOf(nick);
        append = word.substr(nickIdx + nick.length);
        prepend = word.substr(0, nickIdx);
    } else {
        return word;
    }

    let escaped = _.escape(nick);
    let colour = createNickColour(nick);
    ret = `<a class="kiwi-nick" data-nick="${escaped}" style="color:${colour}">${escaped}</a>`;

    if (prepend) {
        ret = _.escape(prepend) + ret;
    }
    if (append) {
        ret += _.escape(append);
    }

    return ret;
}

/**
 * Convert a nickname string to a colour code
 */
let nickColourCache = Object.create(null);
export function createNickColour(nick) {
    let nickLower = nick.toLowerCase();

    if (nickColourCache[nickLower]) {
        return nickColourCache[nickLower];
    }

    // The HSL properties are based on this specific colour
    let startingColour = '#36809B'; // '#449fc1';

    let hash = md5(nickLower);
    let hueOffset = mapRange(hexVal(hash, 14, 3), 0, 4095, 0, 359);
    let satOffset = hexVal(hash, 17);
    let baseColour = Colours.rgb2hsl(Colours.hex2rgb(startingColour));
    baseColour.h = (((baseColour.h * 360 - hueOffset) + 360) % 360) / 360;

    if (satOffset % 2 === 0) {
        baseColour.s = Math.min(1, ((baseColour.s * 100) + satOffset) / 100);
    } else {
        baseColour.s = Math.max(0, ((baseColour.s * 100) - satOffset) / 100);
    }

    let themeMngr = ThemeManager.instance();
    let brightness = themeMngr.themeVar('nick-brightness');
    if (brightness) {
        baseColour.l = parseInt(brightness, 10) / 100;
    }

    let rgb = Colours.hsl2rgb(baseColour);
    let nickColour = Colours.rgb2hex(rgb);

    nickColourCache[nickLower] = nickColour;

    return nickColour;
}

/**
 * Extract a substring from a hex string and parse it as an integer
 * @param {string} hash - Source hex string
 * @param {number} index - Start index of substring
 * @param {number} [length] - Length of substring. Defaults to 1.
 */
export function hexVal(hash, index, len) {
    return parseInt(hash.substr(index, len || 1), 16);
}

/*
 * Re-maps a number from one range to another
 * http://processing.org/reference/map_.html
 */
export function mapRange(value, vMin, vMax, dMin, dMax) {
    let vValue = parseFloat(value);
    let vRange = vMax - vMin;
    let dRange = dMax - dMin;

    return (vValue - vMin) * dRange / vRange + dMin;
}

/**
 * Formats a line of text that will be displayed somewhere
 */
const textFormats = {
    channel_join: '→ %nick (%username@%host) %text',
    channel_part: '← %nick (%username@%host) %text',
    channel_quit: '← %nick (%username@%host) %text',
    channel_kicked: '← %text',
    channel_selfkick: '× %text',
    channel_badpassword: '× %text',
    channel_topic: 'ⓘ %text',
    channel_banned: '× %text',
    channel_badkey: '⚠ %text',
    channel_inviteonly: '⚠ %channel %text',
    channel_alreadyin: '⚠ %nick %text',
    channel_limitreached: '⚠ %channel %text',
    channel_invalid_name: '⚠ %channel %text',
    channel_topic_setby: 'ⓘ %text',
    channel_has_been_invited: 'ⓘ %nick %text',
    server_connecting: '%text',
    server_connecting_error: '%text',
    mode: 'ⓘ %nick %text',
    selfmode: 'ⓘ %nick %text',
    nickname_alreadyinuse: '⚠ %text',
    network_disconnected: '⚠ %text',
    network_connected: '⚠ %text',
    whois_channels: '%text',
    whois_idle_and_signon: '%text',
    whois_away: '%text',
    whois_server: '%text',
    whois_idle: '%text',
    whois_notfound: 'ⓘ %text',
    nick_changed: 'ⓘ %text',
    applet_notfound: '⚠ %text',
    encoding_changed: 'ⓘ %text',
    encoding_invalid: '⚠ %text',
    settings_saved: 'ⓘ %text',
    ignore_title: '%text:',
    ignore_none: '%text',
    ignore_nick: '%text',
    ignore_stop_notice: '%text',
    ignore_stopped: '%text',
    chanop_privs_needed: '⚠ %text',
    no_such_nick: 'ⓘ %nick: %text',
    unknown_command: 'ⓘ %text',
    motd: '%text',
    ctcp_response: '[CTCP %nick reply] %message',
    ctcp_request: '[CTCP %nick] %message',
    privmsg: '%text',
    notice: '%text',
    action: '* %nick %text',
    whois_ident: '%nick [%nick!%ident@%host] * %text',
    whois: '%text',
    who: '%nick [%nick!%ident@%host] * %realname',
    quit: '%text',
    rejoin: '%text',
    set_setting: 'ⓘ %text',
    list_aliases: 'ⓘ %text',
    ignored_pattern: 'ⓘ %text',
    wallops: '[WALLOPS] %text',
    message_nick: '%prefix%nick',
    general_error: '%text',
};

export function formatText(formatId, params) {
    let format = textFormats[formatId];

    // Expand a user mask into its individual parts (nick, ident, hostname)
    if (params.user) {
        params.nick = params.user.nick || '';
        params.username = params.user.username || '';
        params.host = params.user.hostname || '';
        params.prefix = params.user.prefix || '';
    }

    // Do the magic. Use the %shorthand syntax to produce output.
    let result = format.replace(/%([A-Z]{2,})/ig, (match, key) => {
        let ret = '';
        if (typeof params[key] !== 'undefined') {
            ret = params[key];
        }

        return ret;
    });

    return result;
}
