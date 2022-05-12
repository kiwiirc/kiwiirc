'kiwi public';

import { trim } from 'lodash';

import getState from '@/libs/state';
import formatIrcMessage, { createNewBlock } from '@/libs/MessageFormatter';
import { urlRegex, channelRegex } from '@/helpers/TextFormatting';

/**
 * Receives a message, parses its irc blocks, and then finds urls, users, channels and emoji. Each
 * content is extracted to a separate block.
 * E.g. the message:
 *   "this is a message www.google.com and #kiwiirc"
 * will be split into the blocks:
 *   ["this is a message "]["www.google.com"][" and "]["#kiwiirc"]
 * The special content blocks will also contain additional info about their content according to
 * their type, such as the url, nick colour, emoji code...
 * @param {Array} blocks Array of style blocks from MessageFormatter
 * @param {Array} userList List of users to find within the message
 * @returns An array of blocks, where each special content will be extracted into a separate block.
 */
export default function parseMessage(message, formatOpts = {}, userList = null) {
    const emojiList = getState().setting('emojis');

    const blocks = formatIrcMessage(message, formatOpts);
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
    return mergeMatches(block, specialMatches);
}

/**
 * Finds a channel in the word match.
 * @param {String} word Word to be searched for channels.
 * @returns {object} Object with the matched channel, index within the word, and block.
 */
function matchChannel(word) {
    const channelMatch = channelRegex.exec(word);
    // matches the groups (spaces before)(prefix)(channel)(suffix punctuation)

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

/**
 * Finds an url in the word match.
 * @param {String} word Word to be searched for urls.
 * @returns {Object} Object with the index of the url match in the block content, the
 * url match itself, and the new url text to be placed where the first url was.
 */
function matchUrl(word) {
    // this check avoids running the urlRegex, which would return the same result
    // but take much more time to process
    if (!(word.includes('://') || word.startsWith('www'))) {
        return false;
    }

    const urlMatch = urlRegex.exec(word);

    if (urlMatch === null) {
        return false;
    }

    let url = urlMatch[0];

    // Don't allow javascript execution
    if (url.match(/^javascript:/i)) {
        return false;
    }

    // Trim common punctuation from the end of a link. End of scentences etc.
    let punctuation = '.,;:';
    while (punctuation.indexOf(url[url.length - 1]) > -1) {
        url = url.substr(0, url.length - 1);
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
    let punc = ',.!:;+)]?¿\\/<>@';
    let hasProp = Object.prototype.hasOwnProperty;
    let nickIdx = 0;

    const trimWord = trim(word, punc);
    let normWord = trimWord.toUpperCase();

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
 * Merges the special matches into the block.
 * @param {Object} block A block that came from MessageFormatter.formatIrcMessage()
 * @param {Array} specialMatches Array of special matches. See definition above
 * @returns An array of blocks, where each special content will be extracted into a separate block.
 */
function mergeMatches(block, specialMatches) {
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
    if (lastProcessedIndex < block.content.length) {
        resultBlocks.push({
            content: block.content.substr(lastProcessedIndex),
            styles: { ...block.styles },
            containsContent: !!block.content.substr(lastProcessedIndex),
        });
    }

    return resultBlocks;
}
