<template>
    <div class="u-tabbed-view">
        <div :key="prefixID + a" class="u-tabbed-view-tabs">
            <a
                v-for="c in tabs"
                :key="c.name || c.header"
                :class="{
                    'u-tabbed-view-tab': true,
                    'u-tabbed-view-tab--active': c.active
                }"
                @click="setActive(c)"
            >{{ c.header }}</a>
        </div>
        <slot />
    </div>
</template>

<script>
'kiwi public';

let Vue = require('vue');

Vue.component('tabbed-tab', {
    props: {
        header: { status: String },
        focus: { status: Boolean },
        name: { status: String },
    },
    data: function data() {
        return { active: false };
    },
    template: '<div v-if="active" class="u-tabbed-content"><slot></slot></div>',
});

export default Vue.component('tabbed-view', {
    data: function data() {
        return {
            // We increment this when we need to re-render the tabs.
            // Vue doesn't pick up on the $children changes all the time so we handle
            // it ourselves.
            a: 1,
            prefixID: Math.floor(Math.random() * 100000).toString(36),
        };
    },
    computed: {
        tabs: function computedtabs() {
            return this.$children;
        },
    },
    mounted() {
        this.setActiveCheck();
    },
    methods: {
        getActive: function getActive() {
            let foundChild = null;
            this.$children.forEach((child) => {
                if (child.active) {
                    foundChild = child;
                }
            });

            return foundChild;
        },
        setActive: function setActive(c) {
            this.$children.forEach((child) => {
                if (child !== c) {
                    child.active = false;
                }
            });
            c.active = true;

            // Without this, vue doesnt update itself with the new $children :(
            this.a++;
            this.$emit('changed', c.name);
        },
        setActiveByName: function setActiveByName(name) {
            this.$children.forEach((child) => {
                if (child.name === name) {
                    this.setActive(child);
                }
            });
        },
        setActiveCheck: function setActiveCheck() {
            this.$children.forEach((t) => {
                if (t.focus) {
                    this.setActive(t);
                }
            });
        },
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
    padding-top: 15px;
}

.u-tabbed-view-tab {
    display: inline-block;
    cursor: pointer;
    border-width: 0;
    border-style: solid;
    background: #fff;
    font-weight: 600;
    opacity: 1;
    z-index: 1;
    margin-bottom: -3px;
    position: relative;
    width: auto;
    text-align: left;
    box-sizing: border-box;
    padding: 0.5em 1em;
    border-bottom: 3px solid rgba(0, 0, 0, 0.1);
    transition: border 0.3s;
}

.u-tabbed-view-tab:hover,
.u-tabbed-view-tab--active {
    border-bottom-width: 3px;
}

.u-tabbed-view-tab:last-of-type {
    z-index: 1;
    border-radius: 0 4px 0 0;
}

.u-tabbed-content {
    overflow: auto;
    height: 100%;
}

@media screen and (max-width: 769px) {
    .u-tabbed-view-tabs {
        padding-top: 0;
    }

    .u-tabbed-view-tab {
        padding: 10px 20px;
        width: auto;
    }
}
</style>
