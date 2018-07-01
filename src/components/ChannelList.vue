<template>
    <div class="kiwi-channellist">
        <div class="kiwi-channellist-nav">
            <a
                :class="{
                    'u-button-primary': !isLoading,
                    'u-button-secondary': isLoading,
                }"
                class="u-button kiwi-channellist-refresh"
                @click="maybeUpdateList">
                <i v-if="!isLoading" class="fa fa-refresh" aria-hidden="true"/>
                <i v-else class="fa fa-refresh fa-spin" aria-hidden="true"/>
            </a>

            <div class="kiwi-channellist-pagination">
                <a @click="prevPage"><i class="fa fa-step-backward" aria-hidden="true"/></a>
                {{ page + 1 }} / {{ maxPages + 1 }}
                <a @click="nextPage"><i class="fa fa-step-forward" aria-hidden="true"/></a>
            </div>

            <form class="u-form kiwi-channellist-search" @submit.prevent>
                <input v-model="search" :placeholder="$t('do_search')" class="u-input" >
            </form>
        </div>
        <table v-if="!isLoading && list.length > 0" :key="last_updated" width="100%">
            <tbody>
                <tr v-for="channel in paginated" :key="channel.channel">
                    <td>
                        <span v-if="channel.num_users >= 0" class="kiwi-channellist-users">
                            <i class="fa fa-user" aria-hidden="true"/> {{ channel.num_users }}
                        </span>
                        <a class="u-link" @click="joinChannel(channel.channel)">
                            {{ channel.channel }}
                        </a>
                    </td>
                    <td>{{ channel.topic }}</td>
                </tr>
            </tbody>
        </table>
        <div v-else-if="noResults" class="kiwi-channellist-info">
            {{ $t('channel_list_nonefound') }}
        </div>
        <div v-else class="kiwi-channellist-info">{{ $t('channel_list_fetch') }}</div>
    </div>
</template>

<script>

import _ from 'lodash';
import state from '@/libs/state';

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
            return this.listState === 'updated' && this.list.length === 0;
        },
        isLoading() {
            return this.listState === 'updating';
        },
        listState: function listState() {
            return this.network.channel_list_state;
        },
        list: function list() {
            return this.network.channel_list || [];
        },
        filteredList: function filteredList() {
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
        paginated: function paginated() {
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
        maxPages: function maxPages() {
            return Math.floor(this.filteredList.length / this.page_size);
        },
        canGoForward: function canGoForward() {
            return this.page * this.page_size >= this.filteredList.length;
        },
        canGoBackward: function canGoBackward() {
            return this.page > 0;
        },
    },
    watch: {
        search: function watchSearch() {
            this.page = 0;
        },
    },
    methods: {
        nextPage: function nextPage() {
            if (this.page < this.maxPages) {
                this.page++;
            }
        },
        prevPage: function prevPage() {
            if (this.page > 0) {
                this.page--;
            }
        },
        maybeUpdateList: function maybeUpdateList() {
            if (this.listState !== 'updating') {
                this.network.ircClient.raw('LIST');
            }
        },
        joinChannel: function joinChannel(channelName) {
            state.addBuffer(this.network.id, channelName);
            this.network.ircClient.join(channelName);
        },
    },
};
</script>

<style>

.kiwi-channellist {
    box-sizing: border-box;
}

.kiwi-channellist-nav {
    text-align: center;
    margin-top: 10px;
    margin-bottom: 10px;
}

.kiwi-channellist-pagination {
    display: inline-block;
    margin: 0 2em;
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
    padding: 2em 0;
}

.kiwi-channellist table {
    border: none;
    border-collapse: collapse;
}

.kiwi-channellist table tbody td {
    padding: 2px 1em;
}

.kiwi-channellist tr td:first-child {
    white-space: nowrap;
}

.kiwi-channellist-users {
    display: inline-block;
    width: 80px;
    padding: 2px 0;
    border-radius: 3px;
    text-align: center;
}
</style>
