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

    static registerPlugin(plugin, params) {
        PluginProvider = plugin;
        pluginParams = params;
    }

    matchEmoji(word) {
        const emoji = this.getEmoji(word);
        if (!emoji) {
            return false;
        }
        return {
            index: 0,
            match: word,
            type: 'emoji',
            meta: {
                emoji: emoji.code,
            },
        };
    }

    blockToHtml(block, isSingle, showEmoticons) {
        if (!showEmoticons) {
            return block.content;
        }

        const emoji = block.meta.emoji;
        const classes = 'kiwi-messagelist-emoji' + (isSingle ? ' kiwi-messagelist-emoji--single' : '');
        const src = `${this.emojiLocation}${emoji}.png`;

        return `<img class="${classes}" src="${src}" alt="${escape(block.content)}" title="${escape(block.content)}" />`;
    }

    getEmoji(word) {
        if (this.emojiList.hasOwnProperty && !this.emojiList.hasOwnProperty(word)) {
            return false;
        }
        let emoji = {
            ascii: word,
            code: this.emojiList[word],
            url: this.emojiLocation + this.emojiList[word] + '.png',
            // imgProps allows setting properties of <img>
        };
        return emoji;
    }
}
