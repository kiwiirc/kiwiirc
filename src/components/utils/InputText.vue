<template>
    <div class="u-input-text">
        <label v-if="label" :for="inputId">{{ label }}</label>

        <div class="u-input-text-inputs" style="display:flex;">
            <template v-if="type==='password'">
                <input
                    v-model="currentValue"
                    :type="plainTextEnabled && !isEdgeBrowser() ? 'text' : 'password'"
                    :class="{'u-form-input-plaintext' : !isEdgeBrowser() && showPlainText}"
                    :id="inputId"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    class="u-input"
                >

                <i
                    v-if="showPlainText && !isEdgeBrowser()"
                    :class="{'u-input-text-plaintext--active': plainTextEnabled}"
                    class="u-input-text-plaintext fa fa-eye"
                    aria-hidden="true"
                    @click="plainTextEnabled = !plainTextEnabled"
                />
            </template>

            <input
                v-else-if="type==='number'"
                v-model="currentValue"
                :id="inputId"
                type="number"
                class="u-input"
            >
            <textarea
                v-else-if="type==='textarea'"
                v-model="currentValue"
                :id="inputId"
                class="u-input"
            />
            <input
                v-else
                v-model="currentValue"
                :id="inputId"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
                class="u-input"
            >

            <div v-if="$slots.default" class="u-input-text-c">
                <slot/>
            </div>
        </div>
    </div>
</template>

<script>
'kiwi public';

let Vue = require('vue');

export default Vue.component('input-text', {
    props: ['value', 'label', 'type', 'showPlainText'],
    data: function data() {
        return {
            plainTextEnabled: false,
            inputIdCache: '',
        };
    },
    computed: {
        inputId() {
            if (!this.inputIdCache) {
                // eslint-disable-next-line
                this.inputIdCache = 'inp_' + Math.floor(Math.random() * 1e17).toString(36);
            }

            return this.inputIdCache;
        },
        currentValue: {
            get: function getCurrentValue() {
                return this.value;
            },
            set: function setCurrentValue(newVal) {
                this.$emit('input', newVal);
            },
        },
    },
    methods: {
        updateValue: function updateValue(newValue) {
            this.$emit('input', newValue);
        },
        isEdgeBrowser() {
            return navigator.appVersion.indexOf('Edge') > -1;
        },
    },
});
</script>

<style>

.u-input-text {
    position: relative;
    margin: 0 0 20px 0;
    box-sizing: border-box;
}

.u-input-text-inputs {
    display: flex;
    position: relative;
}

.u-input-text input,
.u-input-text textarea {
    box-sizing: border-box;
    flex: 1;
}

.u-input-text input:focus {
    outline: none;
}

.u-input-text-c {
    position: relative;
}

/* Remove spinners from input numbers */
.u-input-text input[type='number'] {
    /* For Firefox */
    -moz-appearance: textfield;
}

.u-input-text input[type=number]::-webkit-inner-spin-button,
.u-input-text input[type=number]::-webkit-outer-spin-button {
    /* For webkit browsers like Safari and Chrome */
    -webkit-appearance: none;
    margin: 0;
}

input[type=text].u-form-input-plaintext,
input[type=password].u-form-input-plaintext {
    padding-right: 40px;
}

.u-input-text-plaintext {
    line-height: normal;
    width: 30px;
    text-align: center;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
    position: absolute;
    right: 7px;
    top: 9px;
}

.u-form--big .u-input-text-plaintext {
    line-height: 40px;
    top: 6px;
}

.u-input-text-plaintext--active,
.u-input-text-plaintext:hover {
    opacity: 1;
}

</style>
