<template>
    <div class="kiwi-controlinput">
        <div class="kiwi-controlinput-inner">
            <div v-if="currentNick" class="kiwi-controlinput-user">
                {{ currentNick }}
            </div>
            <form @submit.prevent="submitForm" class="kiwi-controlinput-form">
                <auto-complete
                    v-if="autocomplete_open"
                    ref="autocomplete"
                    :items="autocomplete_items"
                    :filter="autocomplete_filter"
                    :buffer="buffer"
                    @selected="onAutocompleteSelected"
                    @cancel="onAutocompleteCancel"
                ></auto-complete>
                <div class="kiwi-controlinput-input-wrap">
                    <textarea
                        @keydown="inputKeyDown($event)"
                        @keyup="inputKeyUp($event)"
                        v-model="currentInputValue"
                        class="kiwi-controlinput-input"
                        wrap="off"
                        placeholder="Send a message.."></textarea>
                </div>
                <!--<button type="submit">Send</button>-->
            </form>
        </div>
    </div>
</template>

<script>
import state from 'src/libs/state';
import AutoComplete from './AutoComplete';

export default {
    components: {
        AutoComplete,
    },
    data: function data() {
        return {
            value: '',
            history: [],
            history_pos: 0,
            autocomplete_open: false,
            autocomplete_items: [],
            autocomplete_filter: '',
        };
    },
    props: ['container', 'buffer'],
    computed: {
        currentNick: function currentNick() {
            let activeNetwork = state.getActiveNetwork();
            return activeNetwork ?
                activeNetwork.nick :
                '';
        },
        currentInputValue: {
            get: function getCurrentInputValue() {
                return this.history[this.history_pos] || this.value;
            },
            set: function getCurrentInputValue(newValue) {
                this.value = newValue;
                // Set history position to 1 index over the current size so that
                // it's not pointing at an existing item
                this.history_pos = this.history.length;
            },
        },
    },
    methods: {
        onAutocompleteCancel: function onAutocompleteCancel() {
            this.autocomplete_open = false;
        },
        onAutocompleteSelected: function onAutocompleteSelected(selectedValue) {
            let insert = selectedValue;
            let input = this.$el.querySelector('textarea');
            let inputVal = input.value;
            let beginningVal = inputVal.substr(0, input.selectionStart);
            let endingVal = inputVal.substr(input.selectionStart);

            let idx = 0;

            idx = beginningVal.lastIndexOf(' ');
            if (idx === -1) {
                beginningVal = '';
            } else {
                beginningVal = beginningVal.substr(0, idx + 1);
            }
            idx = endingVal.indexOf(' ');
            if (idx === -1) {
                endingVal = '';
            } else {
                endingVal = endingVal.substr(idx);
            }

            // If no beginningVal because we're at the start of the input, auto insert punctuation
            if (!beginningVal) {
                insert += ', ';
            } else {
                insert += ' ';
            }

            this.value = `${beginningVal}${insert}${endingVal}`;

            this.$nextTick(() => {
                let pos = `${beginningVal}${insert}`.length;
                input.setSelectionRange(pos, pos);
            });

            this.autocomplete_open = false;
        },
        inputKeyDown: function inputKeyDown(event) {
            let meta = false;

            if (navigator.appVersion.indexOf('Mac') !== -1) {
                meta = event.metaKey;
            } else {
                meta = event.altKey;
            }

            // If autocomplete has handled the event, don't also handle it here
            if (this.autocomplete_open && this.$refs.autocomplete.handleOnKeyDown(event)) {
                return;
            }

            if (event.keyCode === 13) {
                event.preventDefault();
                this.submitForm();
            } else if (event.keyCode === 38) {
                // Up
                this.historyBack();
            } else if (event.keyCode === 40) {
                // Down
                this.historyForward();
            } else if (
                event.keyCode === 9
                && !event.shiftKey
                && !event.altKey
                && !event.metaKey
                && !event.ctrlKey
            ) {
                // Tab and no other keys as tab+other is often a keyboard shortcut
                event.preventDefault();
            } else if (meta && event.keyCode === 221) {
                // meta + ]
                // TODO: Switch to the next buffer
            } else if (meta && event.keyCode === 219) {
                // meta + [
                // TODO: Switch to the previous buffer
            }
        },
        inputKeyUp: function inputKeyUp(event) {
            let input = event.currentTarget;
            let inputVal = input.value;
            let tokens = inputVal.substring(0, input.selectionStart).split(' ');
            let currentToken = tokens[tokens.length - 1];

            if (currentToken === '') {
                this.autocomplete_open = false;
            } else if (this.autocomplete_open) {
                // @ is a shortcut to open the nicklist autocomplete. It's not part
                // of the nick so strip it out before passing currentToken to the
                // filter.
                if (currentToken[0] === '@') {
                    currentToken = currentToken.substr(1);
                }
            } else if (currentToken === '@') {
                // Just typed @ so start the nick auto completion
                this.autocomplete_items = this.buildAutoCompleteItems({ users: true });
                this.autocomplete_open = true;
            } else if (inputVal === '/') {
                // Just typed / so start the command auto completion
                // TODO: Get the commands typed up so this can be enabled
                // this.autocomplete_items = this.buildAutoCompleteItems({ commands: true });
                // this.autocomplete_open = true;
            } else if (currentToken === '#') {
                // Just typed # so start the command auto completion
                this.autocomplete_items = this.buildAutoCompleteItems({ buffers: true });
                this.autocomplete_open = true;
            } else if (event.keyCode === 9) {
                // Tab key was just pressed, start general auto completion
                this.autocomplete_items = this.buildAutoCompleteItems({
                    users: true,
                    commands: true,
                    buffers: true,
                });
                this.autocomplete_open = true;
                event.preventDefault();
            }

            if (this.autocomplete_open) {
                this.autocomplete_filter = currentToken;
            }
        },
        submitForm: function submitForm() {
            // Editing a history entry sets .value to the new input value, so check
            // for that before the history value.
            let rawInput = this.value || this.currentInputValue;
            if (!rawInput) {
                return;
            }

            state.$emit('input.raw', rawInput);

            // Add to history, keeping the history trimmed to the last 50 entries
            this.history.push(rawInput);
            this.history.splice(0, this.history.length - 50);
            this.history_pos = this.history.length;

            this.value = '';
        },
        historyBack: function historyBack() {
            if (this.history_pos > 0) {
                this.history_pos--;
            }
        },
        historyForward: function historyForward() {
            // Purposely let history_pos go 1 index beyond the history length
            // so that we can detect if we're not currently using a history value
            if (this.history_pos < this.history.length) {
                this.history_pos++;
            }
        },
        buildAutoCompleteItems: function buildAutoCompleteItems(_opts) {
            let opts = _opts || {};
            let list = [];

            if (opts.users) {
                let userList = this.buffer.users.map(user => {
                    let item = {
                        text: user.nick,
                        type: 'user',
                    };
                    return item;
                });

                list = list.concat(userList);
            }

            if (opts.buffers) {
                let bufferList = [];
                this.buffer.getNetwork().buffers.forEach(buffer => {
                    if (buffer.isChannel()) {
                        bufferList.push({
                            text: buffer.name,
                            type: 'buffer',
                        });
                    }
                });

                list = list.concat(bufferList);
            }

            return list;
        },
    },
    created: function created() {
        state.$on('document.keydown', (ev) => {
            // If we're copying text, don't shift focus
            if (ev.ctrlKey || ev.altKey || ev.metaKey) {
                return;
            }

            // If we're typing into an input box somewhere, ignore
            let elements = ['input', 'select', 'textarea', 'button', 'datalist', 'keygen'];
            let doNotRefocus =
                elements.indexOf(ev.target.tagName.toLowerCase()) > -1 ||
                ev.target.getAttribute('contenteditable');

            if (doNotRefocus) {
                return;
            }

            this.$el.querySelector('.kiwi-controlinput-input').focus();
        });
    },
};
</script>

<style>

.kiwi-controlinput {
    box-sizing: border-box;
}
.kiwi-controlinput-inner {
    align-items: stretch;
    display: flex;
    position: relative;
    height: 100%;
    box-sizing: border-box;
}
.kiwi-controlinput-user {
    flex: 1 80px;
    display: inline-block;
    height: 100%;
}
.kiwi-controlinput-form {
    flex: 1 100%;
}
.kiwi-controlinput-input-wrap {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}
.kiwi-controlinput-input {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    resize: none;
    white-space: nowrap;
    overflow-x: hidden;
}

</style>
