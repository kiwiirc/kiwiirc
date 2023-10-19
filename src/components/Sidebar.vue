<template>
    <div
        :class="['kiwi-sidebar-section-' + section]"
        class="kiwi-sidebar kiwi-theme-bg"
    >
        <span v-if="!sidebarState.isOpen" class="kiwi-sidebar-options">
            <div class="kiwi-sidebar-close" @click="sidebarState.close()">
                {{ $t('close') }}<i class="fa fa-times" aria-hidden="true" />
            </div>
        </span>

        <template v-if="sidebarState.activeComponent">
            <component
                :is="sidebarState.activeComponent"
                v-bind="sidebarState.activeComponentProps"
                :network="network"
                :buffer="buffer"
                :sidebar-state="sidebarState"
            />
        </template>
        <template v-else-if="buffer">
            <template v-if="buffer.isChannel()">
                <sidebar-section-settings
                    v-if="section === 'settings'"
                    :network="network"
                    :buffer="buffer"
                    :sidebar-state="sidebarState"
                />

                <div
                    v-else-if="section === 'user'"
                    class="kiwi-sidebar-userbox"
                    @click.stop=""
                >
                    <user-box
                        :network="network"
                        :buffer="buffer"
                        :user="sidebarState.sidebarUser"
                        :sidebar-state="sidebarState"
                    />
                </div>

                <nicklist
                    v-else-if="section === 'nicklist'"
                    :network="network"
                    :buffer="buffer"
                    :sidebar-state="sidebarState"
                />

                <sidebar-about-buffer
                    v-else-if="section === 'about'"
                    :network="network"
                    :buffer="buffer"
                    :sidebar-state="sidebarState"
                />
            </template>
            <template v-else-if="buffer.isQuery()">
                <div
                    v-if="section === 'user'"
                    class="kiwi-sidebar-userbox"
                    @click.stop=""
                >
                    <user-box
                        :network="network"
                        :buffer="buffer"
                        :user="sidebarState.sidebarUser"
                        :sidebar-state="sidebarState"
                    />
                </div>
            </template>
        </template>
        <template v-else>
            {{ $t('side_buffer') }}
        </template>
    </div>
</template>

<script>
'kiwi public';

import UserBox from '@/components/UserBox';
import SidebarState from './SidebarState';
import SidebarAboutBuffer from './SidebarAboutBuffer';
import SidebarSectionSettings from './SidebarSectionSettings';
import Nicklist from './Nicklist';

export { SidebarState as State };

export default {
    components: {
        SidebarAboutBuffer,
        SidebarSectionSettings,
        Nicklist,
        UserBox,
    },
    props: ['network', 'buffer', 'sidebarState'],
    computed: {
        section() {
            if (this.sidebarState.activeComponent) {
                return 'component';
            }

            return this.sidebarState.section();
        },
    },
    created() {
        this.listen(this.$state, 'sidebar.tab.show', (tabName) => {
            this.showTab(tabName);
        });
    },
    methods: {
        showTab(tabName) {
            this.$refs.tabs.setActiveByName(tabName);
        },
    },
};

</script>

<style lang="less">
.kiwi-sidebar {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 100;
}

.kiwi-sidebar.kiwi-sidebar-section-settings {
    width: 500px;
    max-width: 500px;
}

.kiwi-sidebar .u-form textarea {
    min-width: 100%;
    max-width: 100%;
    min-height: 80px;
    resize: vertical;
}

.kiwi-sidebar-userbox {
    overflow: hidden;
    height: 100%;
}

.kiwi-sidebar-options {
    display: none;
}

@media screen and (max-width: 769px) {
    .kiwi-sidebar-options {
        display: block;
        cursor: pointer;
        font-weight: 600;
        width: 100%;
        position: relative;
        box-sizing: border-box;
        text-transform: uppercase;
        line-height: 47px;
    }

    .kiwi-sidebar-options .kiwi-sidebar-close {
        width: 100%;
        display: block;
        padding: 0 15px;
        height: 50px;
        line-height: 50px;
        text-align: right;
        box-sizing: border-box;
        letter-spacing: 2px;
        transition: background 0.3s;
    }

    .kiwi-sidebar-options .kiwi-sidebar-close i {
        margin-left: 5px;
        font-size: 1.5em;
        line-height: 47px;
        position: relative;
        top: 2px;
    }

    .kiwi-sidebar .u-tabbed-view-tab {
        width: 100%;
    }

    .kiwi-sidebar .u-tabbed-view-tab.u-tabbed-view-tab--active {
        border-bottom: 3px solid #42b992;
        margin-bottom: 0;
    }

    .kiwi-sidebar .u-form input[type="checkbox"] {
        margin-right: 4px;
    }

    .kiwi-sidebar .u-form label span {
        margin-right: 0;
        margin-left: 0;
    }

    .kiwi-container--sidebar-drawn .kiwi-sidebar {
        width: 100%;
        max-width: 100%;
    }
}
</style>
