<template>
    <div class="kiwi-controlinput">
        <div class="kiwi-controlinput-selfuser" :class="{'kiwi-controlinput-selfuser--open': selfuser_open}">
            <self-user :network="buffer.getNetwork()" v-if="selfuser_open && networkState==='connected'"></self-user>
        </div>

        <div class="kiwi-controlinput-inner">
            <div v-if="currentNick" class="kiwi-controlinput-user" @click="toggleSelfUser">
                <span class="kiwi-controlinput-user-nick">{{ currentNick }}</span>
                <i class="fa fa-caret-up" aria-hidden="true"></i>
            </div>
            <form @submit.prevent="submitForm" class="kiwi-controlinput-form">
                <auto-complete
                    v-if="autocomplete_open"
                    ref="autocomplete"
                    :items="autocomplete_items"
                    :filter="autocomplete_filter"
                    :buffer="buffer"
                    @temp="onAutocompleteTemp"
                    @selected="onAutocompleteSelected"
                    @cancel="onAutocompleteCancel"
                ></auto-complete>
                <div class="kiwi-controlinput-input-wrap">
                    <irc-input
                        ref="input"
                        @keydown="inputKeyDown($event)"
                        @keyup="inputKeyUp($event)"
                        @click="closeInputTool"
                        class="kiwi-controlinput-input"
                        wrap="off"
                        :placeholder="$t('input_placeholder')"></irc-input>
                </div>
                <!--<button type="submit">Send</button>-->
            </form>
            <div class="kiwi-controlinput-tools" ref="plugins">
                <a @click.prevent="onToolClickTextStyle" class="kiwi-controlinput-tool">
                    <i class="fa fa-adjust" aria-hidden="true"></i>
                </a>
                <a @click.prevent="onToolClickEmoji" class="kiwi-controlinput-tool">
                    <i class="fa fa-smile-o" aria-hidden="true"></i>
                </a>
                <div v-for="el in pluginUiElements" v-rawElement="el" class="kiwi-controlinput-tool"></div>
            </div>
        </div>

        <div class="kiwi-controlinput-active-tool">
            <component v-bind:is="active_tool" v-bind="active_tool_props"></component>
        </div>
    </div>
</template>

<script>

import _ from 'lodash';
import autocompleteCommands from '@/res/autocompleteCommands';
import state from '@/libs/state';
import GlobalApi from '@/libs/GlobalApi';
import AutoComplete from './AutoComplete';
import ToolTextStyle from './inputtools/TextStyle';
import ToolEmoji from './inputtools/Emoji';
import SelfUser from './SelfUser';

export default {
    components: {
        AutoComplete,
        SelfUser,
    },
    data: function data() {
        return {
            selfuser_open: false,
            value: '',
            history: [],
            history_pos: 0,
            autocomplete_open: false,
            autocomplete_items: [],
            autocomplete_filter: '',
            // Not filtering through the autocomplete list means that the entire word is put
            // in place when cycling through items. Just as with traditional IRC clients when
            // tabbing through nicks.
            // When filtering through the list, we keep typing more of the word we want as the
            // autocomplete list filters its results to show us the relevant items, not replacing
            // the current word until we select an item.
            autocomplete_filtering: true,
            active_tool: null,
            active_tool_props: {},
            pluginUiElements: GlobalApi.singleton().controlInputPlugins,
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
        networkState() {
            let activeNetwork = state.getActiveNetwork();
            return activeNetwork ?
                activeNetwork.state :
                '';
        },
    },
    watch: {
        history_pos: function watchhistoryPos(newVal) {
            let val = this.history[this.history_pos];
            this.$refs.input.setValue(val || '');
        },
    },
    methods: {
        toggleSelfUser() {
            if (this.networkState === 'connected') {
                this.selfuser_open = !this.selfuser_open;
            }
        },
        onToolClickTextStyle: function onToolClickTextStyle() {
            this.toggleInputTool(ToolTextStyle);
        },
        onToolClickEmoji() {
            this.toggleInputTool(ToolEmoji);
        },
        closeInputTool: function closeInputTool() {
            this.active_tool = null;
        },
        toggleInputTool: function toggleInputTool(tool) {
            if (!tool || this.active_tool === tool) {
                this.active_tool = null;
            } else {
                this.active_tool_props = {
                    buffer: this.buffer,
                    ircinput: this.$refs.input,
                };
                this.active_tool = tool;
            }
        },
        onAutocompleteCancel: function onAutocompleteCancel() {
            this.autocomplete_open = false;
        },
        onAutocompleteTemp: function onAutocompleteTemp(selectedValue, selectedItem) {
            if (!this.autocomplete_filtering) {
                this.$refs.input.setCurrentWord(selectedValue);
            }
        },
        onAutocompleteSelected: function onAutocompleteSelected(selectedValue, selectedItem) {
            let word = selectedValue;
            this.$refs.input.setCurrentWord(word);
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

            // When not filtering, select the current autocomplete item so that we can type any
            // character directly after a nick
            if (this.autocomplete_open && !this.autocomplete_filtering) {
                this.$refs.autocomplete.selectCurrentItem();
            }

            if (event.keyCode === 13) {
                event.preventDefault();
                this.submitForm();
            } else if (event.keyCode === 32) {
                // Hitting space after just typing an ascii emoji will get it replaced with
                // its image
                if (state.setting('buffers.show_emoticons')) {
                    let currentWord = this.$refs.input.getCurrentWord();
                    let emojiList = state.setting('emojis');
                    if (emojiList.hasOwnProperty(currentWord.word)) {
                        let emoji = emojiList[currentWord.word];
                        let url = state.setting('emojiLocation') + emoji + '.png';
                        this.$refs.input.setCurrentWord('');
                        this.$refs.input.addImg(currentWord.word + ' ', url);
                    }
                }
            } else if (event.keyCode === 38) {
                // Up
                event.preventDefault();
                this.historyBack();
                this.$nextTick(() => {
                    this.$refs.input.selectionToEnd();
                });
            } else if (event.keyCode === 40) {
                // Down
                event.preventDefault();
                this.historyForward();
                this.$nextTick(() => {
                    this.$refs.input.selectionToEnd();
                });
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
            } else if (meta && event.keyCode === 75) {
                // meta + k
                this.toggleInputTool(ToolTextStyle);
                event.preventDefault();
            }
        },
        inputKeyUp: function inputKeyUp(event) {
            let inputVal = this.$refs.input.getRawText();
            let currentWord = this.$refs.input.getCurrentWord();
            let currentToken = currentWord.word.substr(0, currentWord.position);

            if (event.keyCode === 27 && this.autocomplete_open) {
                this.autocomplete_open = false;
            } else if (this.autocomplete_open && currentToken === '') {
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
                this.openAutoComplete(this.buildAutoCompleteItems({ users: true }));
                this.autocomplete_filtering = true;
            } else if (inputVal === '/') {
                // Just typed / so start the command auto completion
                this.openAutoComplete(this.buildAutoCompleteItems({ commands: true }));
                this.autocomplete_filtering = true;
            } else if (currentToken === '#') {
                // Just typed # so start the command auto completion
                this.openAutoComplete(this.buildAutoCompleteItems({ buffers: true }));
                this.autocomplete_filtering = true;
            } else if (
                event.keyCode === 9
                && !event.shiftKey
                && !event.altKey
                && !event.metaKey
                && !event.ctrlKey
            ) {
                // Tab and no other keys as tab+other is often a keyboard shortcut
                // Tab key was just pressed, start general auto completion
                let items = this.buildAutoCompleteItems({
                    users: true,
                    buffers: true,
                });
                this.openAutoComplete(items);
                this.autocomplete_filter = currentToken;

                // Disable filtering so that tabbing cycles through words more like
                // traditional IRC clients.
                this.autocomplete_filtering = false;
                event.preventDefault();
            }

            if (this.autocomplete_open && this.autocomplete_filtering) {
                this.autocomplete_filter = currentToken;
            }
        },
        submitForm: function submitForm() {
            let rawInput = this.$refs.input.getValue();
            if (!rawInput) {
                return;
            }

            let ircText = this.$refs.input.buildIrcText();
            state.$emit('input.raw', ircText);

            // Add to history, keeping the history trimmed to the last 50 entries
            this.history.push(rawInput);
            this.history.splice(0, this.history.length - 50);
            this.history_pos = this.history.length;

            this.value = '';
            this.$refs.input.reset();
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
        openAutoComplete: function openAutoComplete(items) {
            if (state.setting('showAutocomplete')) {
                this.autocomplete_items = items;
                this.autocomplete_open = true;
            }
        },
        buildAutoCompleteItems: function buildAutoCompleteItems(_opts) {
            let opts = _opts || {};
            let list = [];

            if (opts.users) {
                let userList = _.values(this.buffer.users).map(user => {
                    let item = {
                        text: user.nick,
                        type: 'user',
                    };
                    return item;
                });

                if (this.buffer.isQuery()) {
                    userList.push({
                        text: this.buffer.name,
                        type: 'user',
                    });
                }

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

            if (opts.commands) {
                let commandList = [];
                autocompleteCommands.forEach(command => {
                    commandList.push({
                        text: '/' + command.command,
                        description: command.description,
                        type: 'command',
                    });
                });

                list = list.concat(commandList);
            }

            return list;
        },
    },
    created: function created() {
        this.listen(state, 'document.keydown', (ev) => {
            // No input box currently? Nothing to shift focus to
            if (!this.$refs.input) {
                return;
            }

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

            this.$refs.input.focus();
        });
    },
};
</script>

<style lang="less">

.kiwi-controlinput {
    z-index: 999;
}

.kiwi-controlinput,
.kiwi-controlinput-inner {
    padding: 0;
    box-sizing: border-box;
}

.kiwi-controlinput-user {
    height: 100%;
    padding: 0 10px;
    font-weight: bold;
    text-align: center;
    cursor: pointer;
    margin-right: 10px;
    line-height: 40px;
}

.kiwi-controlinput-tools {
    line-height: 40px;
    cursor: pointer;
    margin-left: 10px;
}

.kiwi-controlinput-form {
    padding: 8px 0 0 0;
    flex: 1;
    overflow: hidden;
}

.kiwi-controlinput-inner {
    display: flex;
    position: relative;
    height: 100%;
    box-sizing: border-box;
    padding: 0;
}

.kiwi-controlinput-input {
    text-align: left;
    height: 100%;
    outline: none;
    border: none;
}

@media screen and (max-width: 769px) {
    .kiwi-controlinput {
        z-index: 0;
    }
}

@media screen and (max-width: 500px) {
    .kiwi-controlinput-user-nick {
        display: none;
    }
}

.kiwi-controlinput-input-wrap {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: visible;
}

.kiwi-controlinput-tool {
    display: inline-block;
    padding: 0 1em;
}

.kiwi-controlinput-tool a {
    cursor: pointer;
}

.kiwi-controlinput-active-tool {
    position: absolute;
    bottom: 100%;
    right: 0;
    z-index: 1;
}

.kiwi-controlinput-selfuser {
    position: absolute;
    bottom: 100%;
    left: 0;
    max-height: 0;
    transition: max-height 0.2s;
    overflow: hidden;
}

.kiwi-controlinput-selfuser--open {
    max-height: 300px;
}

</style>
