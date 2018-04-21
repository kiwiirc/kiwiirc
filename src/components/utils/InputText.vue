<template>
    <div
        :class="[
            'input-text',
            hasFocus ? 'input-text--focus' : '',
            hasFocus || currentValue ? 'input-text--reveal-value' : ''
        ]"
    >

        <span class="input-text-label">{{label}}</span>

        <input
            v-if="type==='password'"
            type="password"
            v-model="currentValue"
            @focus="hasFocus=true"
            @blur="hasFocus=false"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        />
        <input
            v-else-if="type==='number'"
            type="number"
            v-model="currentValue"
            @focus="hasFocus=true"
            @blur="hasFocus=false"
        />
        <input
            v-else
            v-model="currentValue"
            @focus="hasFocus=true"
            @blur="hasFocus=false"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        />

        <div v-if="$slots.default" class="input-text-c">
            <slot></slot>
        </div>

        <div class="input-text-underline">
            <div class="input-text-underline-active"></div>
        </div>
    </div>
</template>


<script>

let Vue = require('vue');

export default Vue.component('input-text', {
    data: function data() {
        return {
            hasFocus: false,
        };
    },
    props: ['value', 'label', 'type'],
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

.input-text {
    position: relative;
    padding-top: 1.2em;
}

.input-text input {
    display: block;
    box-sizing: border-box;
    width: 100%;
    background-color: transparent;
    border: none;
    outline: none;
    line-height: 1.6em;
    font-size: 0.9em;
}

.input-text-label {
    position: absolute;
    left: 3px;
    top: 1.2em;
    transition: top 0.2s, font-size 0.2s;
    pointer-events: none;
}

.input-text--reveal-value .input-text-label {
    top: -7px;
    font-size: 0.8em;
}

.input-text-c {
    position: absolute;
    right: 0;
    bottom: 0;
}

.input-text-underline {
    border-width: 0;
    border-bottom: 1px solid #a9a9a9;
    position: relative;
}

.input-text-underline-active {
    background: #42b983;
    transition: left 0.3s;
    position: absolute;
    height: 2px;
    bottom: -1px;
    right: 0;
    left: 100%;
}

.input-text--focus .input-text-underline-active {
    left: 0;
}

</style>
