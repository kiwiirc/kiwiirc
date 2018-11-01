<template>
    <div class="kiwi-controlinput kiwi-theme-bg">
        <div
            :class="{'kiwi-controlinput-selfuser--open': selfuser_open}"
            class="kiwi-controlinput-selfuser"
        >
            <self-user
                v-if="selfuser_open && networkState==='connected'"
                :network="buffer.getNetwork()"
                @close="selfuser_open=false"
            />
        </div>

        <div class="kiwi-controlinput-inner">
            <div v-if="currentNick" class="kiwi-controlinput-user" @click="toggleSelfUser">
                <span class="kiwi-controlinput-user-nick">{{ currentNick }}</span>
                <i
                    :class="[selfuser_open ? 'fa-caret-down' : 'fa-caret-up']"
                    class="fa"
                    aria-hidden="true"
                />
            </div>
            <form
                class="kiwi-controlinput-form"
                @submit.prevent="submitForm"
                @click="maybeHidePlugins"
            >
                <auto-complete
                    v-if="autocomplete_open"
                    ref="autocomplete"
                    :items="autocomplete_items"
                    :filter="autocomplete_filter"
                    :buffer="buffer"
                    @temp="onAutocompleteTemp"
                    @selected="onAutocompleteSelected"
                    @cancel="onAutocompleteCancel"
                />
                <div class="kiwi-controlinput-input-wrap">
                    <irc-input
                        ref="input"
                        :placeholder="$t('input_placeholder')"
                        class="kiwi-controlinput-input"
                        wrap="off"
                        @input="inputUpdate"
                        @keydown="inputKeyDown($event)"
                        @keyup="inputKeyUp($event)"
                        @click="closeInputTool"/>
                </div>
                <button
                    v-if="shouldShowSendButton"
                    type="submit"
                    class="kiwi-controlinput-send fa fa-paper-plane" />
            </form>

            <div ref="plugins" class="kiwi-controlinput-tools">
                <div
                    :class="{'kiwi-controlinput-tools-container-expand--inverse': !showPlugins}"
                    class="kiwi-controlinput-tools-container-expand"
                    @click="showPlugins=!showPlugins"
                >
                    <i class="fa fa-bars" aria-hidden="true" />
                </div>
                <transition name="kiwi-plugin-ui-trans">
                    <div v-if="showPlugins" class="kiwi-controlinput-tools-container">
                        <a class="kiwi-controlinput-tool" @click.prevent="onToolClickTextStyle">
                            <i class="fa fa-adjust" aria-hidden="true"/>
                        </a>
                        <a v-if="!mobile()" class="kiwi-controlinput-tool" @click.prevent="onToolClickEmoji">
                            <i class="fa fa-smile-o" aria-hidden="true"/>
                        </a>
                        <div
                            v-rawElement="{
                                el: plugin.el,
                                props: {
                                    controlinput: self,
                                }
                            }"
                            v-for="plugin in pluginUiElements"
                            :key="plugin.id"
                            class="kiwi-controlinput-tool"
                        />
                    </div>
                </transition>
            </div>
        </div>

        <div class="kiwi-controlinput-active-tool">
            <component :is="active_tool" v-bind="active_tool_props"/>
        </div>
    </div>
</template>

<script>
'kiwi public';

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
    props: ['container', 'buffer'],
    data() {
        return {
            self: this,
            selfuser_open: false,
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
            showPlugins: true,
            current_input_value: '',
        };
    },
    computed: {
        currentNick() {
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
        shouldShowSendButton() {
            return this.$state.ui.is_touch || this.$state.setting('showSendButton');
        },
    },
    watch: {
        history_pos(newVal) {
            let val = this.history[this.history_pos];
            this.$refs.input.setValue(val || '');
        },
        buffer() {
            if (!state.setting('buffers.shared_input')) {
                this.inputRestore();
            }

            this.autocomplete_open = false;
        },
    },
    created() {
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

        this.listen(this.$state, 'input.insertnick', (nick) => {
            if (!this.$refs.input) {
                return;
            }

            let val = nick;
            if (this.current_input_value === '') {
                val += ': ';
            } else {
                val += ' ';
            }

            this.$refs.input.insertText(val);
        });
    },
    mounted() {
        this.inputRestore();
    },
    methods: {
        mobile() {
            let check = false;
            (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
            return check;
        },
        inputUpdate(val) {
            this.current_input_value = val;

            if (state.setting('buffers.shared_input')) {
                state.ui.current_input = val;
            } else {
                this.buffer.current_input = val;
            }

            this.maybeHidePlugins();
        },
        inputRestore() {
            let currentInput = state.setting('buffers.shared_input') ?
                state.ui.current_input :
                this.buffer.current_input;

            this.$refs.input.reset(currentInput);
            this.$refs.input.selectionToEnd();
        },
        toggleSelfUser() {
            if (this.networkState === 'connected') {
                this.selfuser_open = !this.selfuser_open;
            }
        },
        maybeHidePlugins() {
            // Save some space if we're typing on a small screen
            if (this.$state.ui.app_width < 500) {
                this.showPlugins = false;
            }
        },
        onToolClickTextStyle() {
            this.toggleInputTool(ToolTextStyle);
        },
        onToolClickEmoji() {
            this.toggleInputTool(ToolEmoji);
        },
        closeInputTool() {
            this.active_tool = null;
        },
        toggleInputTool(tool) {
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
        toggleBold() {
            this.$refs.input.toggleBold();
        },
        toggleItalic() {
            this.$refs.input.toggleItalic();
        },
        toggleUnderline() {
            this.$refs.input.toggleUnderline();
        },
        onAutocompleteCancel() {
            this.autocomplete_open = false;
        },
        onAutocompleteTemp(selectedValue, selectedItem) {
            if (!this.autocomplete_filtering) {
                this.$refs.input.setCurrentWord(selectedValue);
            }
        },
        onAutocompleteSelected(selectedValue, selectedItem) {
            let word = selectedValue;
            this.$refs.input.setCurrentWord(word);
            this.autocomplete_open = false;
        },
        inputKeyDown(event) {
            let meta = false;

            if (navigator.appVersion.indexOf('Mac') !== -1) {
                meta = event.metaKey;
            } else {
                meta = event.ctrlKey;
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
                // Tab key was just pressed, start general auto completion
                let currentWord = this.$refs.input.getCurrentWord();
                let currentToken = currentWord.word.substr(0, currentWord.position);

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
            } else if (meta && event.keyCode === 75) {
                // meta + k
                this.toggleInputTool(ToolTextStyle);
                event.preventDefault();
            } else if (meta && event.keyCode === 66) {
                // meta + b
                this.toggleBold();
                event.preventDefault();
            } else if (meta && event.keyCode === 73) {
                // meta + i
                this.toggleItalic();
                event.preventDefault();
            } else if (meta && event.keyCode === 85) {
                // meta + u
                this.toggleUnderline();
                event.preventDefault();
            }
        },
        inputKeyUp(event) {
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
                event.preventDefault();
            }

            if (this.autocomplete_open && this.autocomplete_filtering) {
                this.autocomplete_filter = currentToken;
            }
        },
        submitForm() {
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

            this.$refs.input.reset();
            this.$refs.input.focus();
        },
        historyBack() {
            if (this.history_pos > 0) {
                this.history_pos--;
            }
        },
        historyForward() {
            // Purposely let history_pos go 1 index beyond the history length
            // so that we can detect if we're not currently using a history value
            if (this.history_pos < this.history.length) {
                this.history_pos++;
            }
        },
        openAutoComplete(items) {
            if (state.setting('showAutocomplete')) {
                this.autocomplete_items = items;
                this.autocomplete_open = true;
            }
        },
        buildAutoCompleteItems(_opts) {
            let opts = _opts || {};
            let list = [];

            if (opts.users) {
                let userList = _.values(this.buffer.users).map((user) => {
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
                this.buffer.getNetwork().buffers.forEach((buffer) => {
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
                autocompleteCommands.forEach((command) => {
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

.kiwi-controlinput-inner i {
    font-size: 120%;
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
    /* 38px = 40px controlinput height - margin top+botton */
    line-height: 38px;
    margin: 2px 0 2px 10px;
    border-radius: 7px 0 0 7px;
    cursor: pointer;
}

.kiwi-controlinput-form {
    flex: 1;
    overflow: hidden;
    display: flex;
}

.kiwi-controlinput-send {
    border: none;
    border-radius: 7px;
    margin: 2px 0;
    padding: 0;
    height: 35px;
    text-align: center;
    width: 35px;
    cursor: pointer;
    outline: none;
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

.kiwi-controlinput-input-wrap {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: visible;
    padding-top: 8px;
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

.kiwi-controlinput-tools-container-expand {
    display: inline-block;
    padding: 0 1em;
}

.kiwi-controlinput-tools-container-expand i {
    transition: transform 0.2s;
}

.kiwi-controlinput-tools-container-expand--inverse i {
    transform: rotateZ(180deg);
}

.kiwi-controlinput-tools-container {
    position: relative;
    display: inline-block;
}

.kiwi-plugin-ui-trans-enter,
.kiwi-plugin-ui-trans-leave-to {
    right: -100%;
}

.kiwi-plugin-ui-trans-enter-to,
.kiwi-plugin-ui-trans-leave {
    right: 0;
}

.kiwi-plugin-ui-trans-enter-active,
.kiwi-plugin-ui-trans-leave-active {
    transition: right 0.2s;
}

</style>
