<template>
    <div class="u-tabbed-view">
        <div class="u-tabbed-view-tabs" :key="a">
            <a
                v-for="c in tabs"
                @click="setActive(c)"
                :class="{
                    'u-tabbed-view-tab': true,
                    'u-tabbed-view-tab--active': c.active
                }"
            >{{c.header}}</a>
        </div>
        <slot></slot>
    </div>
</template>


<script>

let Vue = require('vue');

Vue.component('tabbed-tab', {
    template: '<div v-if="active" class="u-tabbed-content"><slot></slot></div>',
    data: function data() {
        return { active: false };
    },
    props: ['header', 'focus'],
});

export default Vue.component('tabbed-view', {
    data: function data() {
        return {
            // We increment this when we need to re-render the tabs.
            // Vue doesn't pick up on the $children changes all the time so we handle
            // it ourselves.
            a: 1,
        };
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

            // Without this, vue doesnt update itself with the new $children :(
            this.a++;
        },
    },
    mounted: function created() {
        this.$children.forEach(t => {
            if (t.focus) {
                this.setActive(t);
            }
        });
    },
});
</script>
