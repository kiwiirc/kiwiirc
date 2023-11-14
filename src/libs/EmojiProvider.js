'kiwi public';

import { escape } from 'lodash';
import getState from '@/libs/state';

export function matchEmoji(word) {
    const emojis = this.getEmojis(word);
    if (!emojis.length) {
        return false;
    }
    return [{
        index: 0,
        match: word,
        type: 'emoji',
        meta: {
            emoji: emojis[0].code,
        },
    }];
}

export function blockToHtml(block, isSingle, showEmoticons) {
    if (!showEmoticons) {
        return block.content;
    }

    const emojiLocation = getState().setting('emojiLocation');
    const emoji = block.meta.emoji;
    const classes = 'kiwi-messagelist-emoji' + (isSingle ? ' kiwi-messagelist-emoji--single' : '');
    const src = `${emojiLocation}${emoji}`;

    return `<img class="${classes}" src="${src}" alt="${escape(block.content)}" title="${escape(block.content)}" />`;
}

export function getEmojis(word) {
    const emojiList = getState().setting('emojis');
    const emojiLocation = getState().setting('emojiLocation');
    if (!Object.prototype.hasOwnProperty.call(emojiList, word)) {
        return [];
    }
    return [{
        ascii: word,
        code: emojiList[word],
        url: emojiLocation + emojiList[word],
        // imgProps allows setting properties of <img>
    }];
}
