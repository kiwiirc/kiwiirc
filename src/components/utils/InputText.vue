<template>
    <div
        :class="[
            'kiwi-input-text',
            hasFocus ? 'kiwi-input-text--focus' : '',
            hasFocus || currentValue ? 'kiwi-input-text--reveal-value' : ''
        ]"
    >

        <span class="kiwi-input-text-label">{{ label }}</span>

        <input
            v-if="type==='password'"
            v-model="currentValue"
            type="password"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off" spellcheck="false" @focus="hasFocus=true" @blur="hasFocus=false"
        >
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

        <div v-if="$slots.default" class="kiwi-input-text-c">
            <slot/>
        </div>

        <div class="kiwi-input-text-underline">
            <div class="kiwi-input-text-underline-active"/>
        </div>
    </div>
</template>

<script>
'kiwi public';

let Vue = require('vue');

export default Vue.component('input-text', {
    props: ['value', 'label', 'type'],
    data: function data() {
        return {
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
    },
});
</script>

<style>

.kiwi-input-text {
    position: relative;
    padding-top: 1.2em;
}

.kiwi-input-text input {
    display: block;
    box-sizing: border-box;
    width: 100%;
    background-color: transparent;
    border: none;
    outline: none;
    line-height: 1.6em;
    font-size: 0.9em;
}

.kiwi-input-text-label {
    position: absolute;
    left: 3px;
    top: 1.2em;
    transition: top 0.2s, font-size 0.2s;
    pointer-events: none;
}

.kiwi-input-text--reveal-value .kiwi-input-text-label {
    top: -7px;
    font-size: 0.8em;
}

.kiwi-input-text-c {
    position: absolute;
    right: 0;
    bottom: 0;
}

.kiwi-input-text-underline {
    border-width: 0;
    border-bottom: 1px solid #a9a9a9;
    position: relative;
}

.kiwi-input-text-underline-active {
    background: #42b983;
    transition: left 0.3s;
    position: absolute;
    height: 2px;
    bottom: -1px;
    right: 0;
    left: 100%;
}

.kiwi-input-text--focus .kiwi-input-text-underline-active {
    left: 0;
}

</style>
