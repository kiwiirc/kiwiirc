<template>
    <div class="kiwi-controlinput">
        <div class="kiwi-controlinput-inner">
            <div v-if="currentNick" class="kiwi-controlinput-user">
                {{ currentNick }}
            </div>
            <form @submit.prevent="submitForm" class="kiwi-controlinput-form">
                <div class="kiwi-controlinput-input-wrap">
                    <textarea
                        @keydown.enter.prevent="submitForm"
                        @keydown.up.prevent="historyBack"
                        @keydown.down.prevent="historyForward"
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

export default {
    data: function data() {
        return {
            value: '',
            history: [],
            history_pos: 0,
        };
    },
    props: ['container'],
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
}

</style>
