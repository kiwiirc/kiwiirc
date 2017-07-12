<template>
    <div class="kiwi-ircinput">
        <div
            class="kiwi-ircinput-editor"
            contenteditable="true"
            role="textbox"
            :placeholder="placeholder"
            ref="editor"
            @keypress="updateValueProps(); $emit('keypress', $event)"
            @keydown="updateValueProps(); $emit('keydown', $event)"
            @keyup="updateValueProps(); $emit('keyup', $event)"
            @mouseup="updateValueProps();"
            @click="$emit('click', $event)"
        ></div>
    </div>
</template>

<script>

import htmlparser from 'htmlparser2';

export default {
    data: function data() {
        return {
            raw_value: '',
            current_el: null,
            current_el_pos: 0,
            current_range: null,
        };
    },
    props: ['placeholder'],
    computed: {
        editor: function editor() {
            return this.$refs.editor;
        },
    },
    watch: {
        current_range: function currentRange(newVal) {
            console.log('current_range changed', newVal);
        },
    },
    methods: {
        updateValueProps: function updateValueProps() {
            console.log('updateValueProps()');
            let selection = window.getSelection();
            this.current_el_pos = selection.anchorOffset;
            this.current_el = selection.anchorNode;

            let range = selection.getRangeAt(0);
            this.current_range = range ?
                range.cloneRange() :
                null;

            this.raw_value = this.$refs.editor.innerHTML;
        },
        buildIrcText: function buildIrcText() {
            let source = this.$refs.editor.innerHTML;
            let textValue = '';

            let parser = new htmlparser.Parser({
                onopentag: (name, attribs) => {
                    if (attribs['data-code']) {
                        textValue += '\x03' + attribs['data-code'];
                    }
                },
                ontext: text => {
                    textValue += text;
                },
                onclosetag: tagName => {
                    if (tagName === 'span') {
                        textValue += '\x03';
                    }
                },
            }, {
                decodeEntities: true,
            });

            /* eslint max-len: off */
            parser.write(source);
            parser.end();

            return textValue;
        },
        reset: function reset() {
            this.$refs.editor.innerHTML = '';
        },
        resetStyles: function resetStyles() {
            this.focus();
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('selectAll', false, null);
            document.execCommand('removeFormat', false, null);
            this.removeUnstyledTags();
        },
        removeUnstyledTags: function removeUneededTags() {
            // Overlapping elements are not automatically removed because we add custom attributes.
            // But the style attribute is removed so we can remove any elements without a
            // style attribute.
            // We can't simply remove the element as it may contain text content so we must replace
            // it with a TextNode
            let editorEl = this.$refs.editor;
            editorEl.querySelectorAll(':not([style]):not(img)').forEach(el => {
                let t = document.createTextNode(el.innerText);
                el.parentNode.replaceChild(t, el);
            });

            /*
            // Firefox has a trailing br for some reason. So remove it if it's there
            let lastChild = editorEl.lastChild;
            if (lastChild && lastChild.tagName && lastChild.tagName.toLowerCase() !== 'br') {
                lastChild.parent.removeChild(lastChild);
            }
            */
        },
        setColour: function setColour(code, color) {
            let editorEl = this.$refs.editor;

            this.focus();
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, color);

            this.removeUnstyledTags();

            // Add the data attributes to any elements that do not have the .handled CSS class.
            // These elements are only going to be the newly created elements since any previous
            // elements will have had the CSS class added already.
            editorEl.querySelectorAll(':not(.handled)').forEach(el => {
                el.dataset.code = code;
                el.classList.add('handled');
            });
        },
        addImg: function addImg(code, url) {
            this.focus();
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('insertImage', false, url);

            let editorEl = this.$refs.editor;

            editorEl.querySelectorAll(':not(.handled)').forEach(el => {
                el.dataset.code = code;
                el.classList.add('handled');
            });
        },

        // Insert some text at the current position
        insertText: function insertText(text) {
            let el = this.current_el;
            let pos = this.current_el_pos;
            let val = el.textContent;
            el.textContent = val.substr(0, pos) + text + val.substr(pos);
        },

        // Replace the word at the current position with another
        setCurrentWord: function setCurrentWord(text, keepPosition) {
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
            } else {
                range.setStart(el, startPos + text.length);
                range.setEnd(el, startPos + text.length);
            }

            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        },

        getCurrentWord: function getCurrentWord() {
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

        // Focus the editable div and move the caret to the end
        focus: function focus() {
            if (this.current_range) {
                let selection = window.getSelection();
                selection.removeAllRanges();
                let range = this.current_range; // .cloneRange();
                // range.collapse();
                console.log('range:', range);
                selection.addRange(range);
            } else {
                console.log('focus() no current_el');
                this.$refs.editor.focus();
            }
            /*
            let range = document.createRange();

            if (!this.current_el) {
                console.log('focus() no current_el');
                this.$refs.editor.focus();
                return;
            }
            console.log('focus()', this.current_el, this.current_el_pos);
            // this.current_el.focus();
            range.setStart(this.current_el, this.current_el_pos);
            range.setEnd(this.current_el, this.current_el_pos);
            range.collapse();
            */

            /*
            if (!this.current_range) {
                console.log('focus() no current_el');
                this.$refs.editor.focus();
                return;
            }

            if (this.current_range) {
                console.log('range:', this.current_range);
                let selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(this.current_range);
            }
            */
        },
    },
};
</script>

<style>

.kiwi-ircinput {
    box-sizing: border-box;
    position: relative;
    overflow: visible;
    z-index: 1;
}
.kiwi-ircinput-editor {
    white-space: nowrap;
    overflow-x: hidden;
    outline: none;
}
.kiwi-ircinput-editor:empty:not(:focus):before {
    content: attr(placeholder);
    /*display: block;*/
}
.kiwi-ircinput-editor img {
    height: 1em;
}

</style>