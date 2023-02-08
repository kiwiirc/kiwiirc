'kiwi public';

import { escape } from 'lodash';
import getState from '@/libs/state';
import EmojiProvider from '@/libs/EmojiProvider';

export default render;

function render(blocks, renderEmoticons) {
    const state = getState();
    const emojiProvider = new EmojiProvider();
    const showEmoticons = typeof renderEmoticons === 'undefined' ?
        state.setting('buffers.show_emoticons') :
        !!renderEmoticons;

    const retHtml = blocks.reduce((html, block, i) => {
        // a
        let style = '';
        let classes = '';

        Object.keys(block.styles).forEach((s) => {
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
                classes += `irc-fg-colour-${block.styles[s]} `;
            } else if (s === 'background') {
                classes += `irc-bg-colour-${block.styles[s]} `;
            }
        });

        let content;
        switch (block.type) {
        case 'url':
            content = linkifyUrl(block, {
                addHandle: state.setting('buffers.show_link_previews'),
                handleClass: 'fa fa-share-square u-link kiwi-messagelist-message-linkhandle',
            });
            break;
        case 'user':
            content = linkifyUser(block);
            break;
        case 'channel':
            content = linkifyChannel(block);
            break;
        case 'emoji':
            content = emojiProvider.blockToHtml(block, blocks.length === 1, showEmoticons);
            break;
        default:
            content = escape(block.content);
        }

        return html + buildSpan(content, classes, style);
    }, '');

    return `${retHtml}`;
}

function linkifyUrl(block, _opts) {
    let opts = _opts || {};
    let nice = '';

    // Shorten the displayed URL if it's going to be too long
    if (block.content.length > 100) {
        nice = escape(block.content.substr(0, 100)) + '...';
    } else {
        nice = escape(block.content);
    }

    // Make the link clickable
    let href = block.meta.url.replace(/"/g, '%22');
    let out = `<a target="_blank" href="${href}" rel="noopener noreferrer">${nice}</a>`;

    if (opts.addHandle) {
        let cssClass = opts.handleClass || '';
        let content = opts.handleContent || '';
        out += `<a data-url="${escape(block.meta.url)}" class="${cssClass}">${content}</a>`;
    }

    return out;
}

function linkifyUser(block) {
    let escaped = escape(block.meta.user);
    let colour = block.meta.colour;

    return `<a class="kiwi-nick" data-nick="${escaped}"` +
        (colour ? ` style="color:${colour}"` : '') +
        `>${escaped}</a>`;
}

function linkifyChannel(block) {
    return `<a class="u-link kiwi-channel" data-channel-name="${escape(block.meta.channel)}">${escape(block.content)}</a>`;
}

function buildSpan(content, classes, style) {
    if (style === '' && classes === '') {
        return content;
    }

    return (
        '<span' +
        (style !== '' ? ` style="${style}"` : '') +
        (classes !== '' ? ` class="${classes}"` : '') +
        `>${content}</span>`
    );
}
