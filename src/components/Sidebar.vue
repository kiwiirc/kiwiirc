<template>
    <div class="kiwi-sidebar" >
        <template v-if="buffer">
            <span class="kiwi-sidebar-options" @click="settings_open = !settings_open">
                <i class="fa fa-cog" aria-hidden="true"></i>
            </span>

            <div v-if="settings_open" class="kiwi-sidebar-settings">
                <label>Show when people join <input type="checkbox" v-model="settingShowJoinParts"></label>
                <label>Extra message formatting <input type="checkbox" v-model="settingExtraFormatting"></label>
                <label>Nick colours in the list <input type="checkbox" v-model="settingColouredNicklist"></label>
            </div>

            <nicklist
                v-if="buffer.isChannel()"
                :network="network"
                :buffer="buffer"
                :users="users"
            ></nicklist>
        </template>
        <template v-else>
            No buffer set
        </template>
    </div>
</template>

<script>

// import state from 'src/libs/state';
import Nicklist from './Nicklist';

export default {
    components: {
        Nicklist,
    },
    data: function data() {
        return {
            settings_open: false,
        };
    },
    props: ['network', 'buffer', 'users'],
    computed: {
        settingShowJoinParts: {
            get: function getSettingShowJoinParts() {
                return this.buffer.setting('show_joinparts');
            },
            set: function setSettingShowJoinParts(newVal) {
                return this.buffer.setting('show_joinparts', newVal);
            },
        },
        settingColouredNicklist: {
            get: function getSettingShowJoinParts() {
                return this.buffer.setting('coloured_nicklist');
            },
            set: function setSettingShowJoinParts(newVal) {
                return this.buffer.setting('coloured_nicklist', newVal);
            },
        },
        settingExtraFormatting: {
            get: function settingExtraFormatting() {
                return this.buffer.setting('extra_formatting');
            },
            set: function settingExtraFormatting(newVal) {
                return this.buffer.setting('extra_formatting', newVal);
            },
        },
        bufferType: function bufferType() {
            let type = '';

            if (!this.buffer) {
                type = 'none';
            } else if (this.buffer.isServer()) {
                type = 'server';
            } else if (this.buffer.isChannel()) {
                type = 'channel';
            } else if (this.buffer.isQuery()) {
                type = 'query';
            }

            return type;
        },
    },
    methods: {
    },
    created: function created() {
    },
};
</script>

<style>

.kiwi-sidebar {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}

.kiwi-sidebar-options {
    display: block;
    margin: 3px 10px;
    text-align: right;
    cursor: pointer;
}

.kiwi-sidebar-settings label {
    display: block;
    margin: 0 5px;
}
.kiwi-sidebar-settings input {
    float: right;
}

</style>
