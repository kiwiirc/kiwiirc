<template>
    <div class="kiwi-ircinput">
        <div
            ref="editor"
            :placeholder="placeholder"
            class="kiwi-ircinput-editor"
            contenteditable="true"
            role="textbox"
            spellcheck="true"
            @keypress="updateValueProps(); $emit('keypress', $event)"
            @keydown="updateValueProps(); $emit('keydown', $event)"
            @keyup="updateValueProps(); $emit('keyup', $event)"
            @textInput="updateValueProps(); onTextInput($event); $emit('textInput', $event)"
            @mouseup="updateValueProps();"
            @click="$emit('click', $event)"
            @paste="onPaste"
            @focus="onFocus()"
            @blur="$emit('blur', $event)"
        />
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as htmlparser from 'htmlparser2';
import * as Colours from '@/helpers/Colours';
import * as Misc from '@/helpers/Misc';

let Vue = require('vue');

export default Vue.component('irc-input', {
    props: ['placeholder'],
    data() {
        return {
            last_known_value: '',
            text_value: '',
            current_el: null,
            current_el_pos: 0,
            default_colour: null,
            code_map: Object.create(null),
        };
    },
    computed: {
        editor() {
            return this.$refs.editor;
        },
    },
    mounted() {
        this.resetStyles();
    },
    methods: {
        onTextInput(event) {
            // Mobile devices trigger a textInput event for things such as autocompletion
            // and suggested words. Unfortunately they end with a return character which
            // is not what we expect, so prevent the original event from inserting anything
            // and manually place it in with the current word.
            if (event.data[event.data.length - 1] === '\n') {
                event.preventDefault();
                this.setCurrentWord(event.data.trim());
            }
        },
        onPaste(event) {
            event.preventDefault();
            if (typeof event.clipboardData !== 'undefined') {
                let ignoreThisPaste = false;
                let clpData = event.clipboardData;
                clpData.types.forEach((type) => {
                    let ignoreTypes = ['Files', 'image'];
                    ignoreTypes.forEach((ig) => {
                        if (type.indexOf(ig) > -1) {
                            ignoreThisPaste = true;
                        }
                    });
                });

                if (ignoreThisPaste) {
                    return;
                }

                document.execCommand('insertText', false, clpData.getData('text/plain'));
            } else {
                // IE11
                let clpText = window.clipboardData.getData('Text');
                if (!clpText) {
                    return;
                }

                let selection = window.getSelection();
                let range = selection.getRangeAt(0);
                if (range) {
                    range.deleteContents();
                    range.insertNode(document.createTextNode(clpText));
                }
            }

            setTimeout(() => {
                this.updateValueProps();
            }, 0);
        },
        onFocus(event) {
            // when the input is empty there are no children to remember the current colour
            // so upon regaining focus we must set the current colour again
            if (!this.getRawText() && this.default_colour) {
                this.setColour(this.default_colour.code, this.default_colour.colour);
            }

            this.$emit('focus', event);
        },
        updateValueProps() {
            let selection = window.getSelection();

            if (selection.rangeCount === 0) {
                return;
            }

            this.current_el_pos = selection.anchorOffset;
            this.current_el = selection.anchorNode;

            this.maybeEmitInput();
        },
        selectionToEnd() {
            // Move the caret to the end
            let el = this.$refs.editor.lastChild || this.$refs.editor;
            this.current_el = el;

            if (el.nodeType === 3) {
                this.current_el_pos = el.length;
            } else {
                this.current_el_pos = 0;
            }
        },
        setValue(newVal) {
            this.value = newVal;
            this.$refs.editor.innerHTML = newVal;
        },
        getValue() {
            return this.$refs.editor.innerHTML;
        },
        maybeEmitInput() {
            let currentHtml = this.$refs.editor.innerHTML;
            if (this.last_known_value !== currentHtml) {
                this.$emit('input', currentHtml);
                this.last_known_value = currentHtml;
            }
        },
        buildIrcText() {
            let source = this.$refs.editor.innerHTML;
            let textValue = '';

            // Toggles are IRC style and colour codes that should be reset at the end of
            // the current tag
            let toggles = [];
            function addToggle(t) {
                toggles[toggles.length - 1] += t;
            }
            function getToggles() {
                return toggles[toggles.length - 1];
            }

            let parser = new htmlparser.Parser({
                onopentag: (name, attribs) => {
                    toggles.push('');
                    let codeLookup = '';
                    if (attribs.style) {
                        let match = attribs.style.match(/color: ([^;]+)/);
                        if (match) {
                            codeLookup = match[1];
                            let mappedCode = this.code_map[codeLookup];
                            if (!mappedCode) {
                                // If we didn't have an IRC code for this colour, convert the
                                // colour to its hex form and check if we have that instead
                                let m = codeLookup.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                                if (m) {
                                    let hex = Colours.rgb2hex({
                                        r: parseInt(m[1], 10),
                                        g: parseInt(m[2], 10),
                                        b: parseInt(m[3], 10),
                                    });
                                    mappedCode = this.code_map[hex];
                                }
                            }

                            if (mappedCode) {
                                textValue += '\x03' + mappedCode;
                                addToggle('\x03' + mappedCode);
                            }
                        }

                        if (attribs.style.indexOf('bold') > -1) {
                            textValue += '\x02';
                            addToggle('\x02');
                        }
                        if (attribs.style.indexOf('italic') > -1) {
                            textValue += '\x1d';
                            addToggle('\x1d');
                        }
                        if (attribs.style.indexOf('underline') > -1) {
                            textValue += '\x1f';
                            addToggle('\x1f');
                        }

                    // Welcome to the IE/Edge sucks section, time to do crazy things
                    // IE11 doesnt support document.execCommand('styleWithCSS')
                    // so we have individual nodes instead, which are handled below
                    } else if (attribs.color) {
                        // IE likes to remove spaces from rgb(1, 2, 3)
                        // it also likes converting rgb to hex
                        let mappedCode = this.code_map[attribs.color] ||
                            this.code_map[attribs.color.replace(/,/g, ', ')] ||
                            this.code_map[Colours.hex2rgb(attribs.color)];

                        if (mappedCode) {
                            textValue += '\x03' + mappedCode;
                            addToggle('\x03' + mappedCode);
                        }
                    } else if (name === 'strong') {
                        textValue += '\x02';
                        addToggle('\x02');
                    } else if (name === 'em') {
                        textValue += '\x1d';
                        addToggle('\x1d');
                    } else if (name === 'u') {
                        textValue += '\x1f';
                        addToggle('\x1f');
                    } else if (name === 'div' || name === 'br') {
                        // divs and breaks are both considered newlines. For each line we need to
                        // close all current toggles and then reopen them for the next so that the
                        // styles continue .
                        textValue += getToggles();
                        textValue += '\n';
                        textValue += getToggles();
                    }

                    if (attribs.src && this.code_map[attribs.src]) {
                        textValue += this.code_map[attribs.src];
                    }
                },
                ontext: (text) => {
                    textValue += text;
                },
                onclosetag: (tagName) => {
                    textValue += getToggles();
                    toggles.pop();
                },
            }, {
                decodeEntities: true,
            });

            parser.write(source);
            parser.end();

            // Firefox likes to add <br/> at the end (some times inside the span)
            // fix by filtering out any lines that contain no content
            return textValue.split(/\r?\n/).filter((line) => !!Misc.stripStyles(line)).join('\n');
        },
        reset(rawHtml) {
            this.$refs.editor.innerHTML = rawHtml || '';

            this.current_el_pos = 0;
            this.current_el = this.$refs.editor;

            // Firefox inserts a <br> on empty contenteditables after it's been reset. But that
            // fucks up the placeholder :empty CSS selector we use. So just remove it.
            let br = this.$refs.editor.querySelector('br');
            if (br) {
                br.parentNode.removeChild(br);
            }

            if (this.default_colour) {
                this.focus();
                this.setColour(this.default_colour.code, this.default_colour.colour);
            }

            this.updateValueProps();
        },
        resetStyles() {
            this.focus();
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('selectAll', false, null);
            document.execCommand('removeFormat', false, null);
            this.default_colour = null;
        },
        setColour(code, colour) {
            // If no current text selection, set this colour as the default colour for
            // future messages too
            let range = window.getSelection().getRangeAt(0);
            if (range && range.collapsed) {
                this.default_colour = {
                    code,
                    colour,
                };
            }

            this.focus();
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, colour);

            this.code_map[colour] = code;
            this.updateValueProps();
        },
        toggleBold() {
            document.execCommand('bold', false, null);
            this.updateValueProps();
        },
        toggleItalic() {
            document.execCommand('italic', false, null);
            this.updateValueProps();
        },
        toggleUnderline() {
            document.execCommand('underline', false, null);
            this.updateValueProps();
        },
        addImg(code, url) {
            this.focus();

            let existingImages = [..._.values(this.$refs.editor.querySelectorAll('img'))];

            document.execCommand('styleWithCSS', false, true);
            document.execCommand('insertImage', false, url);
            this.code_map[url] = code;

            let newImg = null;
            let images = [..._.values(this.$refs.editor.querySelectorAll('img'))];

            // Find image that has just been inserted
            images.forEach((img) => {
                if (existingImages.indexOf(img) === -1) {
                    newImg = img;
                }
            });

            // Find the position of this new image node
            let prevElCnt = 0;
            let el = newImg;
            while (el) {
                el = el.previousSibling;
                prevElCnt++;
            }

            this.current_el = this.$refs.editor;
            this.current_el_pos = prevElCnt;

            this.updateValueProps();
            this.focus();
        },

        // Insert some text at the current position
        insertText(text) {
            this.focus();
            document.execCommand('insertText', false, text);
            this.updateValueProps();
            this.focus();
        },

        // Replace the word at the current position with another
        setCurrentWord(text, keepPosition) {
            let el = this.current_el;
            let pos = this.current_el_pos;
            let val = el.textContent || '';

            let startVal = val.substr(0, pos);
            let space = startVal.lastIndexOf(' ');
            if (space === -1) {
                space = 0;
            } else {
                // include the space after the word
                space++;
            }
            let startPos = space;

            let endVal = val.substr(pos);
            space = endVal.indexOf(' ');
            if (space === -1) space = endVal.length;
            let endPos = space;

            el.textContent = startVal.substr(0, startPos) + text + endVal.substr(endPos);

            // Move the caret after the word
            let range = document.createRange();
            if (keepPosition) {
                range.setStart(el, pos);
                range.setEnd(el, pos);
            } else if (el.nodeType === 3) {
                // TEXT_NODE
                range.setStart(el, startPos + text.length);
                range.setEnd(el, startPos + text.length);
            } else {
                // el is another type of node, so setStart/End() counts in nodes instead
                // of text length
                range.setStart(el, 1);
                range.setEnd(el, 1);
            }

            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            this.updateValueProps();
        },

        getCurrentWord() {
            let el = this.current_el;
            let pos = this.current_el_pos;
            let val = el.textContent;

            let startVal = val.substr(0, pos);
            let space = startVal.lastIndexOf(' ');
            if (space === -1) {
                space = 0;
            } else {
                // include the space after the word
                space++;
            }
            let startPos = space;

            space = val.indexOf(' ', startPos);
            if (space === -1) space = val.length;
            let endPos = space;

            return {
                word: val.substr(startPos, endPos),
                position: pos - startPos,
            };
        },

        getRawText() {
            return this.$refs.editor.innerText;
        },

        // Focus the editable div and move the caret to the end
        focus() {
            let selection = window.getSelection();
            let range = document.createRange();
            range.setStart(this.current_el || this.$refs.editor, this.current_el_pos || 0);

            selection.removeAllRanges();
            selection.addRange(range);
        },
    },
});
</script>

<style>

.kiwi-ircinput {
    box-sizing: border-box;
    position: relative;
    overflow: visible;
    z-index: 1;
}

.kiwi-ircinput-editor {
    overflow-x: hidden;
    outline: none;
    padding: 7px 0 12px 0;

    /* When the contenteditable div is empty firefox makes its height 0px */
    height: 100%;
}

.kiwi-ircinput-editor:empty:not(:focus)::before {
    content: attr(placeholder);
    cursor: text;
}

.kiwi-ircinput-editor img {
    height: 1em;
    vertical-align: -0.1em;
}

</style>
