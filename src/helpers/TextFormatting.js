'kiwi public';

/** @module */

import getState from '@/libs/state';
import ThemeManager from '@/libs/ThemeManager';
import _ from 'lodash';
import * as ipRegex from 'ip-regex';
import i18next from 'i18next';
import * as Colours from './Colours';
import { md5 } from './Md5';

export const urlRegex = new RegExp(
    // Detect either a protocol or 'www.' to start a URL
    /(([A-Za-z][A-Za-z0-9-]*:\/\/)|(www\.))/.source +
        '(' +
        // Hostname and tld
        /([\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF.-]+\.[a-zA-Z]{2,63})/.source +
        '|' +
        // IPv4 address
        ipRegex.v4().source +
        '|' +
        // IPv6 address
        '(\\[?' +
        ipRegex.v6().source +
        '\\]?)' +
        ')' +
        // Optional port..
        /(:[0-9]+)?/.source +
        // Optional path..
        /(\/[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF!:.?$'()[\]*,;~+=&%@!\-/]*)?/.source +
        // Optional fragment
        /(#.*)?/.source,
    'i'
);

export function linkifyChannels(network, word) {
    // "@#kiwiirc," = 3 parts. (prefix=@)(channel=#kiwiirc)(suffix=,)
    return word.replace(network.channelRegex, (match, mLead, mPrefix, mChannel, mSuffix) => {
        let chan = _.escape(mChannel.trim());
        let lead = _.escape(mLead);
        let prefix = _.escape(mPrefix);
        let suffix = _.escape(mSuffix);

        let link = `<a class="u-link kiwi-channel" data-channel-name="${chan}">${chan}</a>`;
        return `${lead}${prefix}${link}${suffix}`;
    });
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
    let format = getState().setting('textFormats.' + formatId);
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
