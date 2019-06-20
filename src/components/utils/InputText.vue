<template>
    <div
        :class="[
            'u-input-text',
            hasFocus ? 'u-input-text--focus' : '',
            hasFocus || currentValue ? 'u-input-text--reveal-value' : ''
        ]"
    >

        <span class="u-input-text-label">{{ label }}</span>

        <template v-if="type==='password'">
            <input
                v-model="currentValue"
                :type="plainTextEnabled && !isEdgeBrowser() ? 'text' : 'password'"
                :class="{'u-form-input-plaintext' : !isEdgeBrowser() && showPlainText}"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off" spellcheck="false"
                @focus="hasFocus=true" @blur="hasFocus=false"
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
            type="number"
            @focus="hasFocus=true"
            @blur="hasFocus=false"
        >
        <input
            v-else
            v-model="currentValue"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off" spellcheck="false" @focus="hasFocus=true" @blur="hasFocus=false"
        >

        <div v-if="$slots.default" class="u-input-text-c">
            <slot/>
        </div>

        <div class="u-input-text-underline">
            <div class="u-input-text-underline-active"/>
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
            hasFocus: false,
        };
    },
    computed: {
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
    padding-top: 1.2em;
}

.u-input-text input {
    display: block;
    box-sizing: border-box;
    width: 100%;
    background-color: transparent;
    border: none;
    outline: none;
    line-height: 1.6em;
    border-bottom: none;
    font-size: 0.9em;
}

.u-input-text-label {
    position: absolute;
    left: 3px;
    top: 1.2em;
    opacity: 0.9;
    transition: top 0.2s, font-size 0.2s, opacity 0.2;
    pointer-events: none;
}

.u-input-text--reveal-value .u-input-text-label {
    top: -7px;
    font-size: 0.8em;
    opacity: 0.5;
}

.u-input-text-c {
    position: absolute;
    right: 0;
    bottom: 0;
}

.u-input-text-underline {
    border-width: 0;
    border-bottom: 1px solid #a9a9a9;
    position: relative;
}

.u-input-text-underline-active {
    background: #42b983;
    transition: left 0.3s;
    position: absolute;
    height: 2px;
    bottom: -1px;
    right: 0;
    left: 100%;
}

.u-input-text--focus .u-input-text-underline-active {
    left: 0;
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
    display: inline-block;
    width: calc(100% - 35px);
    border-bottom: 0;
    padding-right: 0;
}

.u-input-text-plaintext {
    display: inline-block;
    line-height: 40px;
    width: 30px;
    text-align: center;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
}

.u-input-text-plaintext--active,
.u-input-text-plaintext:hover {
    opacity: 1;
}

</style>
