'kiwi public';

/** @module */

/**
 * Enables copying text from buffers with better formatting
 */
export default function copyTextMiddleware(state) {
    return function middleware(client, rawEvents, parsedEvents) {
        addListeners(state);
    };
}
function LogFormatter(msg) {
    let text = '';

    switch (msg.type) {
    case 'privmsg':
        text = `<${msg.nick}> ${msg.message}`;
        break;
    case 'nick':
    case 'mode':
    case 'action':
    case 'traffic':
        text = `${msg.message}`;
        break;
    default:
        text = msg.message;
    }
    if (text.length) {
        return `[${(new Date(msg.time)).toLocaleTimeString({ hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${text}`;
    }
    return null;
}
function addListeners(state) {
    // Better copy pasting
    let copyData = '';
    document.addEventListener('selectionchange', (e) => {
        copyData = [];
        let selection = document.getSelection();
        if (!selection || !document.querySelector('.kiwi-messagelist')) {
            document.querySelector('body').style.userSelect = 'auto';

            let ml = document.querySelector('.kiwi-messagelist');
            if (ml) {
                ml.style.userSelect = 'auto';
            }

            return true;
        }
        // Prevent the selection escaping the message list
        document.querySelector('body').style.userSelect = 'none';
        document.querySelector('.kiwi-messagelist').style.userSelect = 'text';
        let mlsb = document.querySelector('.kiwi-messagelist-scrollback');
        if (mlsb) {
            mlsb.style.userSelect = 'none';
        }

        if (selection.type === 'Range'
            && selection.rangeCount > 0
            && (selection.baseNode.parentNode.closest('.kiwi-messagelist-body')
            || selection.baseNode.parentNode.closest('.kiwi-messagelist-nick'))) {
            let range = document.getSelection().getRangeAt(0);

            // Traverse the DOM to find messages in selection
            let startNode = range.startContainer.parentNode.closest('.kiwi-messagelist-message');
            let endNode = range.endContainer.parentNode.closest('.kiwi-messagelist-message');
            if (!startNode || !endNode || startNode === endNode) {
                return true;
            }

            let node = startNode;
            let messages = [];
            let allMessages = state.getActiveBuffer().getMessages();
            const finder = m => m.id.toString() === node.attributes['data-message-id'].value;

            // This could be more efficent with an id->msg lookup
            while (node) {
                let msg = { ...allMessages.find(finder) };

                // Trim the start text if they've not highlighted the whole line
                if (node === startNode && msg.type === 'privmsg') {
                    msg.message = msg.message.slice(Math.max(range.startOffset, 0));
                }
                messages.push(msg);
                node = node.parentNode.nextElementSibling.querySelector('.kiwi-messagelist-message');
                if (node === endNode) {
                    msg = { ...allMessages.find(finder) };
                    if (msg.type === 'privmsg') {
                        msg.message = msg.message.slice(0, range.endOffset);
                    }
                    messages.push(msg);
                    node = null;
                }
            }

            copyData = messages
                .sort((a, b) => (a.time > b.time ? 1 : -1))
                .filter(m => m.message.trim().length)
                .map(LogFormatter)
                .join('\r\n');
        }
        return false;
    });

    document.addEventListener('copy', (e) => {
        if (!copyData || !copyData.length) { // Just do a normal copy if no special data
            return true;
        }

        if (navigator.clipboard) { // Supports Clipboard API
            navigator.clipboard.writeText(copyData);
        } else {
            let input = document.createElement('textarea');
            document.body.appendChild(input);
            input.innerHTML = copyData;
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        return true;
    });
}
