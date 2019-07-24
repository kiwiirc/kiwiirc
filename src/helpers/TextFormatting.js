'kiwi public';

/** @module */

import state from '@/libs/state';
import ThemeManager from '@/libs/ThemeManager';
import { createNewBlock } from '@/libs/MessageFormatter';
import _ from 'lodash';
import i18next from 'i18next';
import * as ipRegex from 'ip-regex';
import * as Colours from './Colours';
import { md5 } from './Md5';

/**
 * Receives an array of style blocks from MessageFormatter.formatIrcMessage() and parses each one to
 * find urls, users, channels and emoji. When one of these special content is found, the special
 * content is extracted to a separate block.
 * E.g. the block:
 *   ["this is a message www.google.com and #kiwiirc"]
 * will be split into the blocks:
 *   ["this is a message "]["www.google.com"][" and "]["#kiwiirc"]
 * The special content blocks will also contain additional info about their content according to
 * their type, such as the url, nick colour, emoji code...
 * @param {Array} blocks Array of style blocks from MessageFormatter
 * @param {Array} userList List of users to find within the message
 * @returns An array of blocks, where each special content will be extracted into a separate block.
 */
export function formatBlocks(blocks, userList = null) {
    const emojiList = state.setting('emojis');
    let formatedBlocks = blocks.reduce(
        (acc, block, i) => acc.concat(processBlock(block, userList, emojiList)),
        []
    );

    return formatedBlocks;
}

/**
 * Receives a block, splits it into words and tries finding channels, urls, nicks, and emoji.
 * @param {Object} block A block that came from MessageFormatter.formatIrcMessage()
 * @param {Object} userList List of users to find within the message
 * @param {Object} emojiList List of emoji to find within the message
 * @returns An array of blocks, where each special content will be extracted into a separate block.
 */
function processBlock(block, userList, emojiList) {
    const wordsRegex = /\S+/g;

    let wordMatch;
    let word;
    const specialMatches = [];
    // Array containing the special matches. Each `specialMatch` is an object with:
    // {
    //    index: <index of the match>
    //    match: <match, i.e. the text that will be extracted into a new block>
    //    block: <the block that will replace the match>
    // }

    // eslint-disable-next-line no-cond-assign
    while ((wordMatch = wordsRegex.exec(block.content)) !== null) {
        // `wordMatch` is an array with the match and the index of the match. We need that so
        // we can re-construct the original message.

        word = wordMatch[0];

        const match =
            matchChannel(word) ||
            matchUrl(word) ||
            matchUser(word, userList) ||
            matchEmoji(word, emojiList);

        if (match) {
            specialMatches.push({
                index: wordMatch.index + match.index,
                match: match.match,
                block: createNewBlock(
                    match.match,
                    block.styles,
                    match.type,
                    match.meta
                ),
            });
        }
    }

    // if there are no special matches, return the original block as is.
    if (specialMatches.length === 0) {
        return [block];
    }

    // split block with special matches.
    return splitMatches(block, specialMatches);
}

/**
 * Finds a channel in the word match.
 * @param {String} word Word to be searched for channels.
 * @returns {object} Object with the matched channel, index within the word, and block.
 */
function matchChannel(word) {
    const channelRegex = /(^|\s)([@+~&%}]*)([#&][^ .,\007<>\n\r]+?)([:;.,<>\n\r]+)?$/i;
    // matches the groups (spaces before)(prefix)(channel)(suffix punctuation)

    const channelMatch = channelRegex.exec(word);
    // channelMatch[0]: the full match
    // channelMatch[1]: group 1: spaces before)
    // channelMatch[2]: group 2: prefix
    // channelMatch[3]: group 3: channel
    // channelMatch[4]: group 3: suffix
    // channelMatch[index]: index of the match

    if (channelMatch === null) {
        return false;
    }

    return {
        index: channelMatch[1].length + channelMatch[2].length,
        match: channelMatch[3],
        type: 'channel',
        meta: {
            channel: channelMatch[3],
        },
    };
}

const urlRegex = new RegExp(
    // Detect either a protocol or 'www.' to start a URL
    /(([A-Za-z][A-Za-z0-9-]*:\/\/)|(www\.))/.source +
        '(' +
        // Hostname and tld
        /([\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF.-]+\.[a-zA-Z]{2,63})/
            .source +
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
        /(\/[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF!:.?$'()[\]*,;~+=&%@!\-/]*)?/
            .source +
        // Optional fragment
        /(#.*)?/.source,
    'i'
);

/**
 * Finds an url in the word match.
 * @param {String} word Word to be searched for urls.
 * @returns {Object} Object with the index of the url match in the block content, the
 * url match itself, and the new url text to be placed where the first url was.
 */
function matchUrl(word) {
    const urlMatch = urlRegex.exec(word);

    if (urlMatch === null) {
        return false;
    }

    let url = urlMatch[0];

    // Don't allow javascript execution
    if (url.match(/^javascript:/i)) {
        return false;
    }

    // Links almost always contain an opening bracket if the last character is a closing
    // bracket and should be part of the URL.
    // If there isn't an opening bracket but the URL ends in a closing bracket, consider the
    // closing bracket as punctuation outside of the URL.
    if (url.indexOf('(') === -1 && url[url.length - 1] === ')') {
        url = url.substr(0, url.length - 1);
    }

    // Add the http if no protocol was found
    let urlText = url;
    if (urlText.match(/^www\./i)) {
        urlText = 'http://' + url;
    }

    return {
        index: urlMatch.index,
        match: url,
        matchText: urlText,
        type: 'url',
        meta: {
            url: urlText,
        },
    };
}

/**
 * Finds an user in the word match.
 * @param {String} word Word to be searched for users.
 * @returns {Object} Object with the index of the user match in the block content, the
 * user match itself, and the user colour.
 */
function matchUser(word, userList) {
    if (!userList) {
        return false;
    }

    let user = null;
    let punc = ',.!:;-+)]?¿\\/<>@';
    let hasProp = Object.prototype.hasOwnProperty;
    let nickIdx = 0;

    const trimWord = _.trim(word, punc);
    let normWord = trimWord.toLowerCase();

    if (hasProp.call(userList, normWord)) {
        user = userList[normWord];
        nickIdx = word.indexOf(trimWord);
    } else {
        return false;
    }

    return {
        index: nickIdx,
        match: trimWord,
        type: 'user',
        meta: {
            user: trimWord,
            colour: user.colour,
        },
    };
}

/**
 * Finds an emoji in the word match.
 * @param {String} word Word to be searched for emoji.
 * @returns {Object} Object with the index of the emoji match in the block content, the
 * emoji match itself, and the emoji code.
 */
function matchEmoji(word, emojiList) {
    if (emojiList.hasOwnProperty && !emojiList.hasOwnProperty(word)) {
        return false;
    }

    return {
        index: 0,
        match: word,
        type: 'emoji',
        meta: {
            emoji: emojiList[word],
        },
    };
}

/**
 * Splits a block, extracting its special matches.
 * @param {Object} block A block that came from MessageFormatter.formatIrcMessage()
 * @param {Array} specialMatches Array of special matches. See definition above
 * @returns An array of blocks, where each special content will be extracted into a separate block.
 */
function splitMatches(block, specialMatches) {
    const resultBlocks = [];
    let lastProcessedIndex = 0;

    // for each special content, creat a block with the text up to the match, and a block with the
    // special content itself.
    specialMatches.forEach((specialMatch, index) => {
        const beforeMatchContent = block.content.substr(
            lastProcessedIndex,
            specialMatch.index - lastProcessedIndex
        );

        if (beforeMatchContent) {
            resultBlocks.push({
                content: beforeMatchContent,
                styles: { ...block.styles },
                containsContent: !!beforeMatchContent,
            });
        }

        resultBlocks.push(specialMatch.block);

        lastProcessedIndex = specialMatch.index + specialMatch.match.length;
    });

    // remaining content after the last special content.
    if (lastProcessedIndex < block.content.length - 1) {
        resultBlocks.push({
            content: block.content.substr(lastProcessedIndex),
            styles: { ...block.styles },
            containsContent: !!block.content.substr(lastProcessedIndex),
        });
    }

    return resultBlocks;
}

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
