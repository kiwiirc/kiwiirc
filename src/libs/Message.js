'kiwi public';

import Vue from 'vue';
import parseMessage from '@/libs/MessageParser';
import toHtml from '@/libs/renderers/Html';
import GlobalApi from '@/libs/GlobalApi';
import state from './state';

let nextId = 0;

export default class Message {
    constructor(message, user) {
        this.id = extractMessageId(message) || nextId++;
        // Two different times;
        //   time = time in the users local time
        //   server_time = time the server gave us
        this.time = message.time || Date.now();
        this.server_time = message.server_time || this.time;
        this.nick = message.nick;
        this.message = message.message;
        this.tags = message.tags;
        this.type = message.type || 'message';
        this.type_extra = message.type_extra;
        this.ignore = false;
        this.mentioned_urls = [];
        // If embed.payload is truthy, it will be embedded within the message
        this.embed = { type: 'url', payload: null };
        this.html = '';
        this.hasRendered = false;
        // template should be null or a Vue component to render this message
        this.template = message.template || null;
        // bodyTemplate should be null or a Vue component to render in the body of the message
        this.bodyTemplate = message.bodyTemplate || null;
        this.isHighlight = false;

        // We don't want the user object to be enumerable
        Object.defineProperty(this, 'user', { value: user });

        Vue.observable(this);
    }

    render() {
        // Allow plugins to render their own messages if needed
        GlobalApi.singleton().emit('message.render', { message: this });
        return this;
    }

    toHtml(messageList) {
        if (this.hasRendered) {
            return this.html;
        }

        this.hasRendered = true;

        let showEmoticons = state.setting('buffers.show_emoticons') && !messageList.buffer.isSpecial();
        let userList = messageList.buffer.users;
        let useExtraFormatting =
            !messageList.buffer.isSpecial() && messageList.useExtraFormatting && this.type === 'privmsg';

        let blocks = parseMessage(this.message, { extras: useExtraFormatting }, userList);

        state.$emit('message.prestyle', { message: this, blocks: blocks });

        let content = toHtml(blocks, showEmoticons);

        this.mentioned_urls = blocks.filter(block => block.type === 'url').map(block => block.meta.url);
        this.html = content;
        this.maybeAutoEmbed();

        state.$emit('message.poststyle', { message: this, blocks: blocks });
        return this.html;
    }

    maybeAutoEmbed() {
        if (!this.mentioned_urls || this.mentioned_urls.length === 0) {
            return;
        }

        // Only auto preview links on user messages. Traffic, topics, notices, etc would get
        // annoying as they usually contain links of some sort
        if (this.type !== 'privmsg') {
            return;
        }

        let url = this.mentioned_urls[0];

        let whitelistRegex = state.setting('buffers.inline_link_auto_preview_whitelist');
        whitelistRegex = (whitelistRegex || '').trim();
        try {
            if (!whitelistRegex || !(new RegExp(whitelistRegex, 'i')).test(url)) {
                return;
            }
        } catch (err) {
            // A bad regex pattern will throw an error
            return;
        }

        this.embed.payload = url;
        this.embed.type = 'url';
    }
}

function extractMessageId(message) {
    if (!message.tags) {
        return undefined;
    }

    return message.tags.msgid || message.tags['draft/msgid'] || undefined;
}
