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
    props: ['header', 'focus', 'name'],
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
    props: ['activeTab'],
    computed: {
        tabs: function computedtabs() {
            return this.$children;
        },
    },
    methods: {
        getActive: function getActive() {
            let foundChild = null;
            this.$children.forEach(child => {
                if (child.active) {
                    foundChild = child;
                }
            });

            return foundChild;
        },
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
        setActiveByName: function setActiveByName(name) {
            this.$children.forEach(child => {
                if (child.name === name) {
                    this.setActive(child);
                }
            });
        },
        setActiveCheck: function setActiveCheck() {
            if (this.activeTab) {
                this.setActiveByName(this.activeTab);
            } else {
                this.$children.forEach(t => {
                    if (t.focus) {
                        this.setActive(t);
                    }
                });
            }
        },
    },
    mounted() {
        this.setActiveCheck();
    },
    watch: {
        activeTab(newVal) {
            this.setActiveCheck();
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
    transition: border 0.3s;
}

.u-tabbed-view-tab:hover {
    border-bottom-width: 3px;
}

.u-tabbed-view-tab:last-of-type {
    z-index: 1;
    border-radius: 0 4px 0 0;
}

.u-tabbed-view-tab--active {
    border-bottom-width: 3px;
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
