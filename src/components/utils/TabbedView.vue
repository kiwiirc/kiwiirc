<template>
    <div class="u-tabbed-view">
        <div class="u-tabbed-view-tabs">
            <a v-for="c in tabs" @click="setActive(c)" :class="{'u-tabbed-view-tab': true, 'u-tabbed-view-tab--active': c.active}">{{c.header}}</a>
        </div>
        <slot></slot>
    </div>
</template>


<script>

let Vue = require('vue');

Vue.component('tabbed-tab', {
    template: '<div class="u-tabbed-content"><slot v-if="active"></slot></div>',
    data: function data() {
        return { active: false };
    },
    props: ['header', 'focus'],
});

export default Vue.component('tabbed-view', {
    data: function data() {
        return { a: 1 };
    },
    computed: {
        tabs: function computedtabs() {
            return this.$children;
        },
    },
    methods: {
        setActive: function setActive(c) {
            this.$children.forEach(child => {
                if (child !== c) {
                    child.active = false;
                }
            });
            c.active = true;
        },
    },
    mounted: function created() {
        // Without this, vue doesnt update itself with the new $children :(
        this.a++;

        this.tabs.forEach(t => {
            if (t.focus) {
                this.setActive(t);
            }
        });
    },
});
</script>
