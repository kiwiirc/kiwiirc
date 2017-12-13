/* eslint-disable */
const tokens = Object.create(null);
/**
 * Token functions may return:
 * undefined - move forward in the input by the length of the token
 * -1 - do not treat this character as a token and continue as normal content
 * 0+ - move to this point in the input
 */

tokens['_'] = {
    token: '_',
    fn: function(inp, pos, block, prevBlock, openToks) {
        if (openToks[this.token]) {
            delete block.styles['underline'];
            openToks[this.token] = null;
            prevBlock.content += this.token;
            return;
        }

        // If this style is alrady open by something else, ignore it
        if (block.styles['underline'] === true) {
            return -1;
        }

        // Underscores may be part of a word or URL so consider it an opening
        if (pos > 0 && inp[pos - 1] !== ' ') {
            return -1;
        }

        // token if it's on it's own
        // Only underline if we have a closing _ further on
        if (inp.substr(pos).indexOf(this.token) === -1) {
            return -1;
        }

        openToks[this.token] = true;
        block.styles['underline'] = true;
        block.content += this.token;
    },
};
tokens['*'] = {
    token: '*',
    fn: function(inp, pos, block, prevBlock, openToks) {
        if (openToks[this.token]) {
            delete block.styles['bold'];
            openToks[this.token] = null;
            prevBlock.content += this.token;
            return;
        }

        // If this style is alrady open by something else, ignore it
        if (block.styles['bold'] === true) {
            return -1;
        }

        // Ignore is after a : character. :* is usually a kiss emoji
        if (inp[pos - 1] === ':') {
            return -1;
        }

        // Only style if we have a closing * further on
        if (inp.substr(pos + 1).indexOf(this.token) === -1) {
            return -1;
        }

        openToks[this.token] = true;
        block.styles['bold'] = true;
        block.content += this.token;
    },
};
tokens['**'] = {
    token: '**',
    fn: function(inp, pos, block, prevBlock, openToks) {
        if (openToks[this.token]) {
            delete block.styles['italic'];
            openToks[this.token] = null;
            prevBlock.content += this.token;
            return;
        }

        // If this style is alrady open by something else, ignore it
        if (block.styles['italic'] === true) {
            return -1;
        }

        // Only style if we have a closing ** further on
        if (inp.substr(pos).indexOf(this.token) > -1) {
            openToks[this.token] = true;
            block.styles['italic'] = true;
            block.content += this.token;
        }
    },
};
tokens['`'] = {
    token: '`',
    fn: function(inp, pos, block, prevBlock, openToks) {
        if (openToks[this.token]) {
            delete block.styles['quote'];
            openToks[this.token] = null;
            prevBlock.content += this.token;
            return;
        }

        // No styling should appear in this codeblock. Add all the content we can
        // before jumping the position forward in the input
        let str = inp.substr(pos + 1);
        let endPos = str.indexOf(this.token);
        if (endPos > -1) {
            openToks[this.token] = true;
            block.styles['quote'] = true;
            block.content += this.token + str.substr(0, endPos);
            block.containsContent = true;
            // The + 1 because:
            // We added 2 ` characters, but we want the last ` character to call this
            // fn again so it can be closed.
            return pos + endPos + 1;
        }
    },
};

tokens['\x02'] = {
    token: '\x02',
    fn: function(inp, pos, block, prevBlock, openToks) {
        if (openToks[this.token]) {
            delete block.styles['bold'];
            openToks[this.token] = null;
        } else {
            openToks[this.token] = true;
            block.styles['bold'] = true;
        }
    },
};

tokens['\x1D'] = {
    token: '\x1D',
    fn: function(inp, pos, block, prevBlock, openToks) {
        if (openToks[this.token]) {
            delete block.styles['italic'];
            openToks[this.token] = null;
        } else {
            openToks[this.token] = true;
            block.styles['italic'] = true;
        }
    },
};

tokens['\x1F'] = {
    token: '\x1F',
    fn: function(inp, pos, block, prevBlock, openToks) {
        if (openToks[this.token]) {
            delete block.styles['underline'];
            openToks[this.token] = null;
        } else {
            openToks[this.token] = true;
            block.styles['underline'] = true;
        }
    },
};

// Clear all styles
tokens['\x0F'] = {
    token: '\x0F',
    fn: function(inp, pos, block, prevBlock, openToks) {
        Object.keys(block.styles).forEach(k => delete block.styles[k]);
        Object.keys(openToks).forEach(k => delete openToks[k]);
    },
};



// Colours
tokens['\x03'] = {
    token: '\x03',
    fn: function(inp, pos, block, prevBlock, openToks) {
        let colours = {
            0: 'white',
            1: 'black',
            2: 'blue',
            3: 'green',
            4: 'light-red',
            5: 'brown',
            6: 'purple',
            7: 'orange',
            8: 'yellow',
            9: 'light-green',
            10: 'cyan',
            11: 'light-cyan',
            12: 'light-blue',
            13: 'pink',
            14: 'grey',
            15: 'light-grey',
        };

        let colourMatchRegexp = /^\x03(([0-9][0-9]?)(,([0-9][0-9]?))?)/;
        let match = colourMatchRegexp.exec(inp.substr(pos, 6));
        if (match) {
            // fg colour = 2, bg colour = 4
            let fgColour = colours[parseInt(match[2], 10)];
            let bgColour = colours[parseInt(match[4], 10)];
            if (typeof fgColour !== 'undefined') {
                block.styles['color'] = fgColour;
            }
            if (typeof bgColour !== 'undefined') {
                block.styles['background'] = bgColour;
            }

            return pos + match[0].length;
        } else {
            delete block.styles['color'];
            delete block.styles['background'];
        }       
    },
};

export default function parse(inp) {
    let block = createNewBlock();
    let blocks = [block];
    let openTokens = Object.create(null);

    let pos = 0;
    let len = inp.length;

    while (pos < len) {
        console.log('current pos char:', inp[pos]);
        let tok = findTokenAtPosition();
        if (!tok) {
            block.content += inp[pos];
            block.containsContent = true;
            pos++;
            continue;
        }

        // Current character is a token of some sort

        let newBlock = null;

        // Consecutive tokens can stack up styles into the same blocks. A consecutive
        // token means that the block before it will not have any content yet
        if (block.containsContent) {
            newBlock = createNewBlock();
        } else {
            newBlock = block;
        }
        //console.log('block:', block);
        //console.log('newblock:', newBlock);
        Object.assign(newBlock.styles, block.styles);
        let newPos = tok.fn(inp, pos, newBlock, block, openTokens);

        if (newPos === -1) {
            // The token invalidated itself so treat it as content
            block.content += tok.token;
            block.containsContent = true;
            pos += tok.token.length;
            continue;
        }

        block = newBlock;

        // This block may have already been pushed if this is a consecutive token
        if (blocks[blocks.length - 1] !== newBlock) {
            blocks.push(newBlock);
        }

        if (typeof newPos === 'number') {
            pos = newPos;
        } else {
            pos += tok.token.length;
        }
    }

    return blocks;

    function findTokenAtPosition() {
        let tok = tokens[inp.substr(pos, 2)] || tokens[inp[pos]];
        return tok;
    }

    function createNewBlock() {
        let newBlock = {
            styles: {},
            content: '',
            containsContent: false,
        };
        return newBlock;
    }

}

/*
let line = 'normal *bold* **italic** ***bold+italic*** then. `monospaced *font* goes _here_`*bold* normal';
//line = '*_bold+underline_* ****** :* **hi** there';
//line = 'this \x02word\x02 is \x033,5bold';
//line = 'some_long_word _underline me tho_';
//line = '*http://google.com/foo_bar/baz* :*';
let b = parse(line);
let out = '';

console.log('-----------------');

console.log('Blocks:');
b.forEach((bl, idx) => {
    console.log('  ' + idx + '.' ,bl);
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

    if (style === '' && classes === '') {
        out += bl.content;
    } else if (style !== '' && classes !== '') {
        out += `<span style="${style}" class="${classes}">${bl.content}</span>`;
    } else if (style !== '') {
        out += `<span style="${style}">${bl.content}</span>`;
    } else if (classes !== '') {
        out += `<span class="${classes}">${bl.content}</span>`;
    }
});
console.log('Original:', line);
console.log('HTML:', out);
*/