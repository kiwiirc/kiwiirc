import _ from 'lodash';
import * as Colours from './Colours';
import { md5 } from './Md5';
import ThemeManager from 'src/libs/ThemeManager';

/**
 *   Formats a message. Adds bold, underline and colouring
 *   @param      {String}    msg The message to format
 *   @returns    {String}        The HTML formatted message
 */
const colourMatchRegexp = /^\x03(([0-9][0-9]?)(,([0-9][0-9]?))?)/;
export function ircCodesToHtml(input, enableExtras) {
    function spanFromOpen() {
        let style = '';
        let colours;
        let classes = [];
        let result = '';

        if (isTagOpen()) {
            style += (openTags.bold) ? 'font-weight: bold; ' : '';
            style += (openTags.italic) ? 'font-style: italic; ' : '';
            style += (openTags.underline) ? 'text-decoration: underline; ' : '';
            if (openTags.colour) {
                colours = openTags.colour.split(',');
                classes.push(colours[0]);
                if (colours[1]) {
                    classes.push(colours[1]);
                }
            }
            result = '<span class="' + classes.join(' ') + '" style="' + style + '">';
        }

        return result;
    }
    function colourMatch(str) {
        return colourMatchRegexp.exec(str);
    }
    function colourFromNum(num) {
        switch (parseInt(num, 10)) {
        case 0:
            return 'white';
        case 1:
            return 'black';
        case 2:
            return 'blue';
        case 3:
            return 'green';
        case 4:
            return 'light-red';
        case 5:
            return 'brown';
        case 6:
            return 'purple';
        case 7:
            return 'orange';
        case 8:
            return 'yellow';
        case 9:
            return 'light-green';
        case 10:
            return 'cyan';
        case 11:
            return 'light-cyan';
        case 12:
            return 'light-blue';
        case 13:
            return 'pink';
        case 14:
            return 'grey';
        case 15:
            return 'light-grey';
        default:
            return null;
        }
    }
    function isTagOpen() {
        return (openTags.bold || openTags.italic || openTags.underline || openTags.colour);
    }
    function openTag() {
        currentTag = spanFromOpen();
    }
    function closeTag() {
        if (isTagOpen()) {
            out += currentTag + '</span>';
        }
    }
    function addContent(content) {
        if (isTagOpen()) {
            currentTag += content;
        } else {
            out += content;
        }
    }
    // Invisible characters are still selectable. Ie. when copying text
    function addInvisibleContent(content) {
        let tag = `<span class="kiwi-formatting-extras-invisible">${content}</span>`;
        if (isTagOpen()) {
            currentTag += tag;
        } else {
            out += tag;
        }
    }

    let msg = input || '';
    let out = '';
    let currentTag = '';
    let openTags = {
        bold: false,
        italic: false,
        underline: false,
        colour: false,
    };
    let i = 0;
    let colours = [];
    let match = null;

    for (i = 0; i < msg.length; i++) {
        let char = msg[i];

        if (enableExtras) {
            if (char === '&' && i === 0 && msg.indexOf('&gt; ') === 0) {
                // Starting with '> '
                out += '<span class="kiwi-formatting-extras-block">' + msg.substr(5);
                i = msg.length;
                break;
            } else if (char === '`') {
                let nextQuotePos = msg.indexOf('`', i + 1);
                // Only quote if there is a closing quote later in the string
                if (nextQuotePos > -1) {
                    closeTag();

                    out += '<span class="kiwi-formatting-extras-quote">';
                    addInvisibleContent('`');
                    out += msg.substring(i + 1, nextQuotePos);
                    addInvisibleContent('`');
                    out += '</span>';
                    i = nextQuotePos;
                    continue;
                }
            } else if (char === '*') {
                let isBold = msg.substr(i, 2) === '**';
                let moreBoldExists = isBold && msg.indexOf('**', i + 2) > -1;
                let isItalic = !isBold;
                let moreItalicExists = isItalic && msg.indexOf('*', i + 1) > -1;

                if (isBold && moreBoldExists && !openTags.bold) {
                    closeTag();
                    openTags.bold = true;
                    openTag();
                    addInvisibleContent('**');
                    // Skip the next *
                    i++;
                    continue;
                } else if (isBold && openTags.bold) {
                    addInvisibleContent('**');
                    closeTag();
                    openTags.bold = false;
                    openTag();
                    // Skip the next *
                    i++;
                    continue;
                } else if (isItalic && moreItalicExists && !openTags.italic) {
                    closeTag();
                    openTags.italic = true;
                    openTag();
                    addInvisibleContent('*');
                    continue;
                } else if (isItalic && openTags.italic) {
                    addInvisibleContent('*');
                    closeTag();
                    openTags.italic = false;
                    openTag();
                    continue;
                }
            } else if (char === '\n') {
                addContent('<br>');
                continue;
            }
        }

        if (char === '\x02') {
            closeTag();
            openTags.bold = !openTags.bold;
            openTag();
            continue;
        } else if (char === '\x1D') {
            closeTag();
            openTags.italic = !openTags.italic;
            openTag();
            continue;
        } else if (char === '\x1F') {
            closeTag();
            openTags.underline = !openTags.underline;
            openTag();
            continue;
        } else if (char === '\x03') {
            closeTag();
            match = colourMatch(msg.substr(i, 6));
            if (match) {
                i += match[1].length;
                // 2 & 4
                colours[0] = 'irc-fg-colour-' + colourFromNum(match[2]);
                if (match[4]) {
                    colours[1] = 'irc-bg-colour-' + colourFromNum(match[4]);
                }
                openTags.colour = colours.join(',');
            } else {
                openTags.colour = false;
            }
            openTag();
            continue;
        } else if (char === '\x0F') {
            closeTag();
            openTags.bold = openTags.italic = openTags.underline = openTags.colour = false;
            continue;
        }

        addContent(msg[i]);
    }

    closeTag();

    return out;
}

const urlRegex = new RegExp('' +
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
    'ig'
);

export function linkifyUrls(input, _opts) {
    let opts = _opts || {};
    let foundUrls = [];
    let result = input.replace(urlRegex, _url => {
        let url = _url;
        let nice = url;

        // Don't allow javascript execution
        if (url.match(/^javascript:/i)) {
            return url;
        }

        // Add the http if no protoocol was found
        if (url.match(/^www\./i)) {
            url = 'http://' + url;
        }

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

        foundUrls.push(url);
        return out;
    });

    return {
        urls: foundUrls,
        html: result,
    };
}

export function linkifyChannels(word) {
    return word.replace(/(^|\s)([#&][^ .,\007<>]+)$/i, _channel => {
        let channelName = _channel.trim();
        return `<a class="u-link kiwi-channel" data-channel-name="${_.escape(channelName)}">` +
            _.escape(_channel) +
        '</a>';
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
