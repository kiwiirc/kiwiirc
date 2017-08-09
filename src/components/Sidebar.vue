<template>
    <div class="kiwi-sidebar" :class="{'kiwi-sidebar--wide': sidebarIsWide}">
        <template v-if="buffer">
            <template v-if="buffer.isChannel()">

                <span v-if="sidebarIsWide" class="kiwi-sidebar-options" @click="sidebarIsWide=false">
                    {{$t('close')}} <i class="fa fa-caret-right" aria-hidden="true"></i>
                </span>
                <span v-else class="kiwi-sidebar-options" @click="settings_open = !settings_open">
                    <i class="fa fa-cog" aria-hidden="true"></i> {{$t('side_options')}}
                </span>

                <div
                    v-if="settings_open"
                    class="kiwi-sidebar-buffersettings"
                    @click.stop=""
                >

                    <tabbed-view>
                        <tabbed-tab :header="$t('settings')" :focus="true">
                            <channel-info v-bind:buffer="buffer"></channel-info>

                            <div class="kiwi-sidebar-settings">
                                <h3>{{$t('side_settings')}}</h3>
                                <label><input type="checkbox" v-model="settingShowJoinParts"> {{$t('side_joins')}}</label>
                                <label><input type="checkbox" v-model="settingExtraFormatting"> {{$t('side_formatting')}}</label>
                                <label><input type="checkbox" v-model="settingColouredNicklist"> {{$t('side_colours')}}</label>
                            </div>
                        </tabbed-tab>
                        <tabbed-tab :header="$t('banned')">
                            <channel-banlist v-bind:buffer="buffer"></channel-banlist>
                        </tabbed-tab>
                        <tabbed-tab :header="$t('notifications')">
                            <buffer-settings v-bind:buffer="buffer"></buffer-settings>
                        </tabbed-tab>
                    </tabbed-view>
                </div>

                <div
                    v-if="userbox_user"
                    class="kiwi-sidebar-userbox"
                    @click.stop=""
                >
                    <user-box
                        :user="userbox_user"
                        :buffer="buffer"
                        :network="network"
                    ></user-box>
                </div>

                <nicklist
                    v-if="buffer.isChannel()"
                    :network="network"
                    :buffer="buffer"
                    :users="users"
                ></nicklist>
            </template>
            <template v-else-if="buffer.isQuery()">
                <!-- TODO:
                invite to an open channel<br />
                ignore this user<br />
                something else
                -->
            </template>
        </template>
        <template v-else>
            {{$t('side_buffer')}}
        </template>
    </div>
</template>

<script>

import state from 'src/libs/state';
import BufferSettings from './BufferSettings';
import ChannelInfo from './ChannelInfo';
import ChannelBanlist from './ChannelBanlist';
import UserBox from 'src/components/UserBox';
import Nicklist from './Nicklist';

export default {
    components: {
        BufferSettings,
        ChannelInfo,
        ChannelBanlist,
        Nicklist,
        UserBox,
    },
    data: function data() {
        return {
            settings_open: false,
            userbox_user: null,
        };
    },
    props: ['network', 'buffer', 'users'],
    computed: {
        sidebarIsWide: {
            get: function getSidebarIsWide() {
                return this.settings_open || this.userbox_user;
            },
            set: function setSidebarIsWide(newVal) {
                if (!newVal) {
                    this.settings_open = false;
                    this.userbox_user = null;
                }
            },
        },
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
        this.listen(state, 'sidebar.hide', () => {
            this.settings_open = false;
        });

        this.listen(state, 'userbox.show', (user, opts) => {
            this.userbox_user = user;
        });
        this.listen(state, 'userbox.hide', () => {
            this.userbox_user = null;
        });
    },
};
</script>

<style>

.kiwi-sidebar {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.kiwi-sidebar--wide {
    width: 500px;
    border-left: 3px solid #dddddd;
}
@media screen and (max-width: 700px) {
    .kiwi-sidebar--wide {
        width: 100%;
        right: 0;
    }
}
.kiwi-sidebar--wide .kiwi-sidebar-buffersettings {
    /*
    animation-duration: 2s;
    animation-name: settingstransition;
    */
}
.kiwi-sidebar--wide .kiwi-nicklist {
    display: none;
}

.kiwi-sidebar-options {
    display: block;
    margin: 1em;
    cursor: pointer;
}

.kiwi-sidebar-buffersettings {
    overflow: hidden;
    height: 100%;
}

.kiwi-sidebar-settings label {
    display: block;
}

@keyframes settingstransition {
  from { margin-top: 50px; }
  to   { margin-top: 100px; }
}
@keyframes nicklisttransition {
  from { height: 0; }
  to   { height: 100%; }
}

</style>
