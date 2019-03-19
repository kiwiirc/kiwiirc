'kiwi public';

/** @module */

import state from '@/libs/state';
import ThemeManager from '@/libs/ThemeManager';
import _ from 'lodash';
import i18next from 'i18next';
import * as ipRegex from 'ip-regex';
import * as Colours from './Colours';
import { md5 } from './Md5';

export const urlRegex = new RegExp(
    // Detect either a protocol or 'www.' to start a URL
    /(([A-Za-z][A-Za-z0-9-]*:\/\/)|(www\.))/.source +
    '(' +
        // Hostname and tld
        /([\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF.-]+\.[a-zA-Z]{2,63})/.source + '|' +
        // IPv4 address
        ipRegex.v4().source + '|' +
        // IPv6 address
        '(\\[?' + ipRegex.v6().source + '\\]?)' +
    ')' +
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
    let result = input.replace(urlRegex, (_url) => {
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
            out += `<a data-url="${_.escape(url)}" class="${cssClass}">${content}</a>`;
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
    Object.keys(urls).forEach((urlId) => {
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
        return `<img class="${classes}" src="${src}" alt="${word}" title="${word}" />`;
    }

    return word;
}

const channelMatch = /(^|\s)([@+~&%}]*)([#&][^ .,\007<>\n\r]+?)([:;.,<>\n\r]+)?$/i;
export function linkifyChannels(word) {
    // "@#kiwiirc," = 3 parts. (prefix=@)(channel=#kiwiirc)(suffix=,)
    return word.replace(channelMatch, (match, mLead, mPrefix, mChannel, mSuffix) => {
        let chan = _.escape(mChannel.trim());
        let lead = _.escape(mLead);
        let prefix = _.escape(mPrefix);
        let suffix = _.escape(mSuffix);

        let link = `<a class="u-link kiwi-channel" data-channel-name="${chan}">${chan}</a>`;
        return `${lead}${prefix}${link}${suffix}`;
    });
}

export function linkifyUsers(word, userlist) {
    let ret = '';
    let user = null;
    let prepend = '';
    let append = '';
    let punc = ',.!:;-+)]?¿\\/<>@';
    let validLastChar = punc.indexOf(word[word.length - 1]) > -1;
    let hasProp = Object.prototype.hasOwnProperty;

    let hasNick = nick => hasProp.call(userlist, nick.toLowerCase());
    let getNick = (nick) => {
        let obj = {
            user: userlist[nick.toLowerCase()],
            originalNick: nick,
        };
        return obj;
    };

    // Checking for a user in order of processing cost
    if (hasNick(word)) {
        user = getNick(word);
    } else if (hasNick(word.substr(0, word.length - 1)) && validLastChar) {
        // The last character is usually punctuation of some kind
        user = getNick(word.substr(0, word.length - 1));
        append = word[word.length - 1];
    } else if (hasNick(_.trim(word, punc))) {
        user = getNick(_.trim(word, punc));
        let nickIdx = word.indexOf(user.originalNick);
        append = word.substr(nickIdx + user.originalNick.length);
        prepend = word.substr(0, nickIdx);
    } else {
        return word;
    }

    let escaped = _.escape(user.originalNick);
    let colour = user.user.colour;

    ret = `<a class="kiwi-nick" data-nick="${escaped}"`;
    if (colour) {
        ret += ` style="color:${colour}"`;
    }
    ret += `>${escaped}</a>`;

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
export function createNickColour(nick) {
    let nickLower = nick.toLowerCase();

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
 * Format a string according to the configured textFormats, including a
 * translation for the %text formatting variable
 */
export function formatAndT(formatId, formatParams, localeId, localeParams) {
    let body = t(localeId, localeParams);
    if (formatParams) {
        formatParams.text = body;
        body = formatText(formatId, formatParams);
    } else {
        body = formatText(formatId, { text: body });
    }

    return body;
}

/**
 * Create a user reference string similar to 'nick'
 */
export function formatUser(fNick) {
    let nick = fNick;

    // Allow passing of a user object or irc-framework event
    if (typeof nick === 'object') {
        nick = nick.nick;
    }

    return formatText('user', { nick });
}

/**
 * Create a full user reference similar to 'nick (user@host)'
 */
export function formatUserFull(fNick, fUsername, fHost) {
    let nick = '';
    let username = '';
    let host = '';

    // Allow passing of a user object or irc-framework event
    if (typeof fNick === 'object') {
        let user = fNick;
        nick = user.nick;
        username = user.username || user.ident;
        host = user.hostname || user.host;
    } else {
        nick = fNick;
        username = fUsername;
        host = fHost;
    }

    return formatText('user_full', { nick, username, host });
}

/**
 * Format a string according to the configured textFormats
 */
export function formatText(formatId, formatParams) {
    let format = state.setting('textFormats.' + formatId);
    let params = formatParams;

    // Most texts only have a 'text' variable so allow passing of a string for this
    // variable as shorthand.
    if (typeof params === 'string') {
        params = { text: params };
    }

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

export function enrichText(text, showEmoticons, emojiList, emojiLocation, userList) {
    let urls = [];
    let words = text.split(' ');
    words = words.map((word, wordIdx) => {
        let parsed;

        let linkified = this.linkifyUrls(word, {
            addHandle: true,
            handleClass: 'fa fa-chevron-right kiwi-messagelist-message-linkhandle',
        });
        if (linkified.urls.length > 0) {
            urls = urls.concat(linkified.urls);
            return linkified.html;
        }

        parsed = this.linkifyChannels(word);
        if (parsed !== word) return parsed;

        if (userList) {
            parsed = this.linkifyUsers(word, userList);
            if (parsed !== word) return parsed;
        }

        if (showEmoticons) {
            parsed = this.addEmojis(
                { word, words, wordIdx },
                emojiList,
                emojiLocation
            );
            if (parsed !== word) return parsed;
        }

        return _.escape(word);
    });

    return { html: words.join(' '), urls: urls };
}

export function styleBlocksToHtml(blocks, showEmoticons, userList) {
    let urls = [];
    let html = '';
    let emojiList = state.setting('emojis');
    let emojiLocation = state.setting('emojiLocation');

    blocks.forEach((bl, idx) => {
        let style = '';
        let classes = '';

        Object.keys(bl.styles).forEach((s) => {
            if (s === 'underline') {
                style += 'text-decoration:underline;';
            } else if (s === 'bold') {
                style += 'font-weight:bold;';
            } else if (s === 'italic') {
                style += 'font-style:italic;';
            } else if (s === 'quote') {
                classes += 'kiwi-formatting-extras-quote ';
            } else if (s === 'block') {
                classes += 'kiwi-formatting-extras-block ';
            } else if (s === 'color') {
                classes += `irc-fg-colour-${bl.styles[s]} `;
            } else if (s === 'background') {
                classes += `irc-bg-colour-${bl.styles[s]} `;
            }
        });

        let content = this.enrichText(
            bl.content,
            showEmoticons,
            emojiList,
            emojiLocation,
            userList
        );
        urls = urls.concat(content.urls);

        if (style === '' && classes === '') {
            html += content.html;
        } else if (style !== '' && classes !== '') {
            html += `<span style="${style}" class="${classes}">${content.html}</span>`;
        } else if (style !== '') {
            html += `<span style="${style}">${content.html}</span>`;
        } else if (classes !== '') {
            html += `<span class="${classes}">${content.html}</span>`;
        }
    });
    return { html: html, urls: urls };
}

// Convert a given duration in seconds to human readable weeks,days,hours,minutes,seconds
// only showing the duration parts that are used eg 3666 --> 1 hour, 1 minute, 6 seconds
export function formatDuration(timeSeconds) {
    let seconds = timeSeconds;

    const weeks = Math.floor(seconds / (3600 * 24 * 7));
    seconds -= weeks * 3600 * 24 * 7;

    const days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;

    const hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;

    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;

    const tmp = [];
    (weeks) && tmp.push(t('week', { count: weeks }));
    (weeks || days) && tmp.push(t('day', { count: days }));
    (days || hours) && tmp.push(t('hour', { count: hours }));
    (days || hours || minutes) && tmp.push(t('minute', { count: minutes }));
    tmp.push(t('second', { count: seconds }));

    return tmp.join(' ');
}

export function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

export function t(key, options) {
    let val = i18next.t(key, options);
    if (!val) {
        let opts = options || {};
        opts.lng = 'en-us';
        val = i18next.t(key, opts);
    }
    return val;
}
