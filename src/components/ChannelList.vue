<template>
    <div :class="{'kiwi-channellist-padding-top': !list.length}" class="kiwi-channellist">
        <div class="kiwi-channellist-content-container">
            <div class="kiwi-channellist-nav">
                <form class="u-form u-form--big kiwi-channellist-search" @submit.prevent>
                    <input v-model="search" :placeholder="$t('do_search')" class="u-input">
                    <a
                        :class="{
                            'u-button-primary': !isLoading,
                            'u-button-secondary': isLoading,
                        }"
                        class="u-button kiwi-channellist-refresh"
                        @click="maybeUpdateList"
                    >
                        <i v-if="!isLoading" class="fa fa-refresh" aria-hidden="true" />
                        <i v-else class="fa fa-refresh fa-spin" aria-hidden="true" />
                    </a>
                </form>
                <div v-if="list.length" class="kiwi-channellist-pagination">
                    <a @click="prevPage"><i class="fa fa-step-backward" aria-hidden="true" /></a>
                    {{ page + 1 }} / {{ maxPages + 1 }}
                    <a @click="nextPage"><i class="fa fa-step-forward" aria-hidden="true" /></a>
                </div>
            </div>
            <div v-if="!isLoading && !noResults" class="kiwi-channellist-table">
                <div
                    v-for="channel in paginated"
                    :key="channel.channel"
                    class="kiwi-channellist-grid"
                >
                    <div
                        class="kiwi-channellist-users"
                    >{{ channel.num_users || 0 }}</div>
                    <div
                        class="u-link kiwi-channellist-name"
                        @click="joinChannel(channel.channel)"
                    >{{ channel.channel }}</div>
                    <span
                        class="kiwi-channellist-topic"
                        v-html="formatAndTrimTopic(channel.topic)"
                    />
                    <div class="kiwi-channellist-join">
                        <a
                            class="u-button u-button-primary"
                            @click="joinChannel(channel.channel)"
                        >{{ $t('container_join') }}</a>
                    </div>
                </div>
            </div>
            <div v-else-if="noResults" class="kiwi-channellist-info">
                <p>{{ $t('channel_list_nonefound') }}</p>
            </div>
            <div v-else class="kiwi-channellist-info">{{ $t('channel_list_fetch') }}</div>
            <div class="kiwi-channellist-nav">
                <div v-if="list.length" class="kiwi-channellist-pagination">
                    <a @click="prevPage"><i class="fa fa-step-backward" aria-hidden="true" /></a>
                    {{ page + 1 }} / {{ maxPages + 1 }}
                    <a @click="nextPage"><i class="fa fa-step-forward" aria-hidden="true" /></a>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import toHtml from '@/libs/renderers/Html';
import parseMessage from '@/libs/MessageParser';

export default {
    props: ['network'],
    data: function data() {
        return {
            sidebarOpen: false,
            page: 0,
            page_size: 200,
            search: '',
            last_updated: 0,
        };
    },
    computed: {
        noResults() {
            return this.listState === 'updated' && this.filteredList.length === 0;
        },
        isLoading() {
            return this.listState === 'updating';
        },
        listState() {
            return this.network.channel_list_state;
        },
        list() {
            return this.network.channel_list || [];
        },
        filteredList() {
            let list = [];

            if (this.search.length <= 2) {
                list = this.list;
            } else {
                list = this.list.filter((channel) => {
                    let found = false;
                    if (channel.channel.toLowerCase().indexOf(this.search) > -1) {
                        found = true;
                    }
                    if (channel.topic.toLowerCase().indexOf(this.search) > -1) {
                        found = true;
                    }
                    return found;
                });
            }

            return _.sortBy(list, 'num_users').reverse();
        },
        paginated() {
            let offset = this.page * this.page_size;
            let list = this.filteredList;
            let channels = [];
            for (let i = offset; i < offset + this.page_size; i++) {
                if (list[i]) {
                    channels.push(list[i]);
                }
            }

            return channels;
        },
        maxPages() {
            return Math.floor(this.filteredList.length / this.page_size);
        },
        canGoForward() {
            return this.page * this.page_size >= this.filteredList.length;
        },
        canGoBackward() {
            return this.page > 0;
        },
    },
    watch: {
        search() {
            this.page = 0;
        },
    },
    methods: {
        nextPage() {
            if (this.page < this.maxPages) {
                this.page++;
            }
        },
        prevPage() {
            if (this.page > 0) {
                this.page--;
            }
        },
        maybeUpdateList() {
            this.network.maybeUpdateChannelList();
        },
        formatAndTrimTopic(rawTopic) {
            let showModes = this.$state.setting('showChanlistModes');

            let topic = showModes ? rawTopic : rawTopic.replace(/^\[([^\]]+)\] ?/, '');
            let blocks = parseMessage(topic, { extras: false });
            let content = toHtml(blocks);
            return content;
        },
        joinChannel(channelName) {
            let buffer = this.$state.getBufferByName(this.network.id, channelName);
            if (buffer) {
                // Switch buffer if its already exists
                this.$state.setActiveBuffer(this.network.id, channelName);
                return;
            }

            this.$state.addBuffer(this.network.id, channelName);
            this.network.ircClient.join(channelName);
            if (this.$state.ui.is_narrow) {
                // This is a mobile device
                // Switch to the channel so the user can see something happend
                this.$state.setActiveBuffer(this.network.id, channelName);
            }
        },
    },
};
</script>

<style>

.kiwi-channellist {
    box-sizing: border-box;
    padding-bottom: 1em;
    text-align: center;
    transition: all 0.6s;
}

.kiwi-channellist-padding-top {
    padding-top: calc(45vh - 80px);
}

.kiwi-channellist-padding-top .kiwi-channellist-nav {
    width: 100%;
    text-align: center;
}

.kiwi-channellist-nav {
    padding: 10px 20px;
    box-sizing: border-box;
}

/* Input form styling */
.kiwi-channellist-nav .u-form {
    display: flex;
    justify-content: center;
}

.kiwi-channellist-nav .u-form .u-input {
    width: 324px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.kiwi-channellist-nav .u-form .u-button-primary,
.kiwi-channellist-nav .u-form .u-button-secondary {
    font-size: 1.3em;
    border-radius: 0 5px 5px 0;
    border: none;
    display: flex;
    align-items: center;
}

.kiwi-channellist-nav .u-form .u-button-primary i,
.kiwi-channellist-nav .u-form .u-button-secondary i {
    margin-left: -2px;
}

.kiwi-channellist-pagination {
    display: inline-block;
    margin: 20px auto 10px auto;
    font-size: 1.2em;
}

.kiwi-channellist-pagination a {
    display: inline-block;
    margin: 0 10px;
    cursor: pointer;
}

.kiwi-channellist-search {
    display: inline-block;
}

.kiwi-channellist-info {
    text-align: center;
}

/* Table Styling */

.kiwi-channellist-table {
    margin: 0 auto;
    width: 90%;
    max-width: 1800px;
    box-sizing: border-box;
}

.kiwi-channellist-grid {
    display: grid;
    grid-template-columns: 66px 130px auto min-content;
    border-bottom: 1px solid;
    align-items: center;
    text-align: left;
}

.kiwi-channellist-grid:first-of-type {
    border-top: 1px solid;
}

.kiwi-channellist-users {
    line-height: auto;
    margin-left: 0.2em;
    overflow: hidden;
    padding: 0.3em;
    text-align: left;
    white-space: nowrap;
}

.kiwi-channellist-users::before {
    font-family: fontAwesome, sans-serif;
    padding-right: 0.4em;
    content: '\f007';
}

.kiwi-channellist-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.kiwi-channellist-topic {
    display: inline-block;
    grid-column: 3;
    padding: 0.3em 0.5em;
}

.kiwi-channellist-topic:empty {
    display: none;
}

.kiwi-channellist-join {
    grid-column: 4;
    padding: 0.3em;
}

@media screen and (max-width: 1024px) {
    .kiwi-channellist-padding-top {
        padding-top: 100px;
    }
}

@media screen and (max-width: 770px) {
    .kiwi-channellist-nav .u-form .u-input {
        width: 100%;
    }

    /* Table Styling */
    .kiwi-channellist-table {
        width: 100%;
    }

    .kiwi-channellist-grid {
        grid-template-columns: 66px auto min-content;
    }

    .kiwi-channellist-topic {
        grid-column: 1 / span 3;
        grid-row: 2;
        word-break: break-word;
    }

    .kiwi-channellist-join {
        grid-column: 3;
    }
}

</style>
