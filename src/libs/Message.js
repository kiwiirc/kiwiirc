'kiwi public';

import parseMessage from '@/libs/MessageParser';
import toHtml from '@/libs/renderers/Html';
import GlobalApi from '@/libs/GlobalApi';
import state from './state';

let nextId = 0;

export default class Message {
    constructor(message, user) {
        this.id = extractMessageId(message) || nextId++;
        this.time = message.time || Date.now();
        this.nick = message.nick;
        this.message = message.message;
        this.tags = message.tags;
        this.type = message.type || 'message';
        this.type_extra = message.type_extra;
        this.ignore = false;
        this.mentioned_urls = [];
        this.html = '';
        // template should be null or a Vue component to render this message
        this.template = message.template || null;
        // bodyTemplate should be null or a Vue component to render in the body of the message
        this.bodyTemplate = message.bodyTemplate || null;
        this.isHighlight = false;

        // We don't want the user object to be enumerable
        Object.defineProperty(this, 'user', { value: user });
    }

    render() {
        // Allow plugins to render their own messages if needed
        GlobalApi.singleton().emit('message.render', { message: this });
        return this;
    }

    toHtml(messageList) {
        if (this.html) {
            return this.html;
        }

        let showEmoticons = state.setting('buffers.show_emoticons') && !messageList.buffer.isSpecial();
        let userList = messageList.buffer.users;
        let useExtraFormatting =
            !messageList.buffer.isSpecial() && messageList.useExtraFormatting && this.type === 'privmsg';

        let blocks = parseMessage(this.message, { extras: useExtraFormatting }, userList);

        state.$emit('message.prestyle', { message: this, blocks: blocks });

        let content = toHtml(blocks, showEmoticons);

        this.mentioned_urls = blocks.filter(block => block.type === 'url').map(block => block.meta.url);
        this.html = content;

        state.$emit('message.poststyle', { message: this, blocks: blocks });
        return this.html;
    }
}

function extractMessageId(message) {
    if (!message.tags) {
        return undefined;
    }

    return message.tags.msgid || message.tags['draft/msgid'] || undefined;
}
