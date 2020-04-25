<template>
    <div :style="{display: block ? 'block' : 'inline-block'}" class="u-input-prompt">
        <div v-if="state==='pre'" @click="prompt"><slot /></div>

        <form v-if="state==='prompt'" class="u-form" @submit.prevent="complete">
            <span class="u-input-prompt-label">{{ label }}</span>
            <div class="u-input-prompt-inputs">
                <input v-model="value" class="u-input" @keyup.esc="cancel">
                <a class="u-button u-button-primary" @click="complete">{{ $t('ok') }}</a>
                <a
                    v-if="!hideCancel"
                    class="u-button u-button-warning"
                    @click="cancel"
                >
                    {{ $t('cancel') }}
                </a>
            </div>
        </form>
    </div>
</template>

<script>
'kiwi public';

let Vue = require('vue');

export default Vue.component('input-prompt', {
    props: ['label', 'hideCancel', 'noprompt', 'block'],
    data: function data() {
        return {
            value: '',
            state: 'pre',
        };
    },
    created() {
        if (this.noprompt) {
            this.prompt();
        }
    },
    methods: {
        prompt: function prompt() {
            this.state = 'prompt';
            this.$nextTick(() => {
                this.$el.querySelector('input').focus();
            });
        },
        complete: function complete() {
            this.$emit('submit', this.value);
            this.state = 'pre';
        },
        cancel: function cancel() {
            this.$emit('cancel');
            this.state = 'pre';
        },
    },
});
</script>

<style>
.u-input-prompt-inputs {
    display: flex;
}

.u-input-prompt-inputs > input {
    flex: 1;
    margin-right: 1em;
}

.u-input-prompt-inputs > a {
    margin-right: 0.5em;
}
</style>
