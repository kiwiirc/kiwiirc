<template>
    <div class="u-input-confirm kiwi-theme-bg">
        <div v-if="state==='pre'" @click="prompt"><slot/></div>

        <template v-if="state==='prompt'">
            <span class="u-input-confirm-label">{{ label }}</span>
            <a :class="['u-button-'+connoteCss.yes]" class="u-button" @click="complete(true)">
                {{ $t('yes') }}
            </a>
            <a :class="['u-button-'+connoteCss.no]" class="u-button" @click="complete(false)">
                {{ $t('no') }}
            </a>
        </template>
    </div>
</template>

<script>
'kiwi public';

let Vue = require('vue');

export default Vue.component('input-confirm', {
    props: ['label', 'flipConnotation'],
    data: function data() {
        return {
            state: 'pre',
        };
    },
    computed: {
        connoteCss() {
            return {
                yes: this.flipConnotation ? 'warning' : 'primary',
                no: this.flipConnotation ? 'primary' : 'warning',
            };
        },
    },
    created() {
        if (!this.$slots.default) {
            this.state = 'prompt';
        }
    },
    methods: {
        prompt() {
            this.state = 'prompt';
        },
        complete(val) {
            this.$emit('submit', val);
            this.$emit(val ? 'ok' : 'cancel');
            this.state = 'pre';
        },
    },
});
</script>

<style>
.u-input-confirm {
    display: inline-block;
    padding: 10px;
}
</style>
