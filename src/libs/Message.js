'kiwi public';

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
        // template should be null or a Vue component to render this message
        this.template = null;
        // bodyTemplate should be null or a Vue component to render in the body of the message
        this.bodyTemplate = null;
        this.isHighlight = false;

        // We don't want the user object to be enumerable
        Object.defineProperty(this, 'user', {
            value: user,
        });
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

        let showEmoticons = state.setting('buffers.show_emoticons') &&
            !messageList.buffer.isSpecial();
        let userList = messageList.buffer.users;
        let useExtraFormatting = !messageList.buffer.isSpecial() &&
            messageList.useExtraFormatting &&
            this.type === 'privmsg';

        let blocks = formatIrcMessage(this.message, {
            extras: useExtraFormatting,
        });

        state.$emit('message.prestyle', { message: this, blocks: blocks });

        let content = TextFormatting.styleBlocksToHtml(blocks, showEmoticons, userList);

        this.mentioned_urls = content.urls;
        this.html = content.html;

        state.$emit('message.poststyle', { message: this, blocks: blocks });
        return this.html;
    }
}
