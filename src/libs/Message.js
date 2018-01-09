import _ from 'lodash';
import * as TextFormatting from '@/helpers/TextFormatting';
import formatIrcMessage from '@/libs/MessageFormatter';
import GlobalApi from '@/libs/GlobalApi';
import state from './state';

let nextId = 0;

export default class Message {
    constructor(message, user) {
        this.id = message.tags && message.tags['draft/msgid'] ?
            message.tags['draft/msgid'] :
            nextId++;
        this.time = message.time || Date.now();
        this.nick = message.nick;
        this.message = message.message;
        this.tags = message.tags;
        this.type = message.type || 'message';
        this.type_extra = message.type_extra;
        this.ignore = false;
        this.mentioned_urls = [];
        this.html = '';

        // We don't want the user object to be enumerable
        Object.defineProperty(this, 'user', {
            value: user,
        });
    }

    toHtml(messageList) {
        if (this.html) {
            return this.html;
        }

        // Allow plugins to render their own messages if needed
        GlobalApi.singleton().emit('message:render', { message: this });
        if (this.html) {
            return this.html;
        }

        let showEmoticons = state.setting('buffers.show_emoticons') &&
            !messageList.buffer.isSpecial();
        let emojiList = state.setting('emojis');
        let emojiLocation = state.setting('emojiLocation');
        let userList = messageList.buffer.users;
        let useExtraFormatting = !messageList.buffer.isSpecial() &&
            messageList.useExtraFormatting &&
            this.type === 'privmsg';

        let html = '';
        let blocks = formatIrcMessage(this.message, {
            extras: useExtraFormatting,
        });

        blocks.forEach((bl, idx) => {
            let style = '';
            let classes = '';

            Object.keys(bl.styles).forEach(s => {
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

            if (style === '' && classes === '') {
                html += content;
            } else if (style !== '' && classes !== '') {
                html += `<span style="${style}" class="${classes}">${content}</span>`;
            } else if (style !== '') {
                html += `<span style="${style}">${content}</span>`;
            } else if (classes !== '') {
                html += `<span class="${classes}">${content}</span>`;
            }
        });

        this.html = html;
        return this.html;
    }

    enrichText(text, showEmoticons, emojiList, emojiLocation, userList) {
        let words = text.split(' ');
        words = words.map((word, wordIdx) => {
            let parsed;

            let linkified = TextFormatting.linkifyUrls(word, {
                addHandle: true,
                handleClass: 'fa fa-chevron-right kiwi-messagelist-message-linkhandle',
            });
            if (linkified.urls.length > 0) {
                this.mentioned_urls = this.mentioned_urls.concat(linkified.urls);
            }
            if (linkified.html !== word) return linkified.html;

            parsed = TextFormatting.linkifyChannels(word);
            if (parsed !== word) return parsed;

            parsed = TextFormatting.linkifyUsers(word, userList);
            if (parsed !== word) return parsed;

            if (showEmoticons) {
                parsed = TextFormatting.addEmojis(
                    { word, words, wordIdx },
                    emojiList,
                    emojiLocation
                );
                if (parsed !== word) return parsed;
            }

            return _.escape(word);
        });

        return words.join(' ');
    }
}
