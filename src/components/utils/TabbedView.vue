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

<style>
.u-tabbed-view {
    display: flex;
    flex-direction: column;
    height: 100%;
}
.u-tabbed-view-tabs {
}
.u-tabbed-view-tab {
    padding: 1em 2em;
    display: inline-block;
    cursor: pointer;
    border-width: 0;
    border-style: solid;
}
.u-tabbed-view-tab:hover {
    border-bottom-width: 3px;
}
.u-tabbed-view-tab--active {
    border-bottom-width: 3px;
}
.u-tabbed-content {
    padding-top: 10px;
    overflow: auto;
    height: 100%;
}
@media screen and (max-width: 500px) {
    .u-tabbed-view-tab {
        padding: 10px 20px;
    }
}
</style>