'kiwi public';

import { escape } from 'lodash';
import getState from '@/libs/state';

let PluginProvider;
let pluginParams;

export default class EmojiProvider {
    constructor() {
        if (PluginProvider) {
            return new PluginProvider(...pluginParams);
        }
        const state = getState();
        this.emojiLocation = state.setting('emojiLocation');
        this.emojiList = state.setting('emojis');
    }

    static registerPlugin(plugin, ...params) {
        PluginProvider = plugin;
        pluginParams = params;
    }

    matchEmoji(word) {
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

    blockToHtml(block, isSingle, showEmoticons) {
        if (!showEmoticons) {
            return block.content;
        }

        const emoji = block.meta.emoji;
        const classes = 'kiwi-messagelist-emoji' + (isSingle ? ' kiwi-messagelist-emoji--single' : '');
        const src = `${this.emojiLocation}${emoji}`;

        return `<img class="${classes}" src="${src}" alt="${escape(block.content)}" title="${escape(block.content)}" />`;
    }

    getEmojis(word) {
        if (!this.emojiList.hasOwnProperty(word)) {
            return [];
        }
        return [{
            ascii: word,
            code: this.emojiList[word],
            url: this.emojiLocation + this.emojiList[word],
            // imgProps allows setting properties of <img>
        }];
    }
}
