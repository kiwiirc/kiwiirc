<template>
    <div class="input-prompt">
        <div v-if="state==='pre'" @click="prompt"><slot></slot></div>

        <form class="u-form" v-if="state==='prompt'" @submit.prevent="complete">
            <span class="input-prompt-label">{{label}}</span>
            <input class="u-input" v-model="value" @keyup.esc="cancel" />
            <a @click="complete" class="u-button u-button-primary">{{$t('ok')}}</a>
            <a @click="cancel" class="u-button u-button-warning">{{$t('cancel')}}</a>
        </form>
    </div>
</template>


<script>

let Vue = require('vue');

export default Vue.component('input-prompt', {
    data: function data() {
        return {
            value: '',
            state: 'pre',
        };
    },
    props: ['label'],
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
.input-prompt {
    display: inline-block;
}
</style>
