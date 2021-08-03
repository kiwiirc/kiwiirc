<template>
    <div :style="{display: block ? 'block' : 'inline-block'}" class="u-input-prompt">
        <div v-if="state==='pre'" @click="prompt"><slot /></div>

        <form v-if="state==='prompt'" class="u-form" @submit.prevent="complete">
            <span class="u-input-prompt-label">{{ label }}</span>
            <div class="u-input-prompt-inputs">
                <input v-model="value" class="u-input" @keyup.esc="cancel">
                <a class="u-button u-button-primary" @click="complete">
                    <span :class="{'u-input-prompt-hidden': waiting}">{{ $t('ok') }}</span>
                    <div v-if="waiting" class="u-input-prompt-waiting">
                        <i class="fa fa-spin fa-spinner" aria-hidden="true" />
                    </div>
                </a>
                <a
                    v-if="!hideCancel"
                    class="u-button u-button-warning"
                    @click="cancel"
                >{{ $t('cancel') }}</a>
            </div>
        </form>
    </div>
</template>

<script>
'kiwi public';

let Vue = require('vue');

export default Vue.component('input-prompt', {
    props: ['label', 'hideCancel', 'block'],
    data() {
        return {
            value: '',
            state: 'pre',
            waiting: false,
        };
    },
    computed: {
        hasChildren() {
            return !!this.$slots.default;
        },
    },
    created() {
        if (!this.hasChildren) {
            this.prompt();
        }
    },
    methods: {
        prompt() {
            this.state = 'prompt';
            this.$nextTick(() => {
                this.$el.querySelector('input').focus();
            });
        },
        complete() {
            if (this.waiting) {
                return;
            }

            if (this.hasChildren) {
                this.state = 'pre';
            } else {
                this.waiting = true;
            }

            const doneWaiting = () => {
                this.waiting = false;
            };

            this.$emit('submit', this.value, doneWaiting);
        },
        cancel() {
            if (this.hasChildren) {
                this.state = 'pre';
            }

            this.$emit('cancel');
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

.u-input-prompt-inputs > .u-button-primary {
    position: relative;
}

.u-input-prompt-hidden {
    visibility: hidden;
}

.u-input-prompt-waiting {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    font-size: 150%;
    font-weight: 800;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}
</style>
