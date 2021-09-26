<template>
    <div class="kiwi-autocomplete kiwi-theme-bg">

        <div
            v-for="item in filteredAndLimitedItems"
            :key="item.type+item.text"
            :class="{
                'kiwi-autocomplete-item': true,
                'kiwi-autocomplete-item--selected': item.idx === selected_idx}
            "
            @click="selected_idx = item.idx; selectCurrentItem()"
        >
            <template v-if="item.type === 'user'">
                <span class="kiwi-autocomplete-item-value">{{ item.text }}</span>
                <span
                    class="u-link kiwi-autocomplete-item-action"
                    @click.stop="openQuery(item.text)"
                >
                    {{ $t('send_message') }}
                </span>
            </template>
            <template v-else-if="item.type === 'command'">
                <span class="kiwi-autocomplete-item-value">{{ item.text }}</span>
                <span class="u-link kiwi-autocomplete-item-description">
                    {{ item.description }}
                </span>
            </template>
            <template v-else>
                <span class="kiwi-autocomplete-item-value">{{ item.text }}</span>
            </template>
        </div>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';

export default {
    props: ['filter', 'buffer', 'items'],
    data: function data() {
        return {
            // items: [
            //     { text: 'anick1', type: 'user' },
            //     { text: 'anick2', type: 'user' },
            //     { text: 'bnick3', type: 'user' },
            //     { text: 'cnick4' },
            //     { text: 'dnick5' },
            // ],
            selected_idx: 0,
        };
    },
    computed: {
        filteredItems() {
            let filterVal = (this.filter || '').toLowerCase();

            return _(this.items).filter((item) => {
                let s = false;
                if (item.text.toLowerCase().indexOf(filterVal) === 0) {
                    s = true;
                }

                (item.alias || []).forEach((alias) => {
                    if (alias.toLowerCase().indexOf(filterVal) === 0) {
                        s = true;
                    }
                });

                return s;
            })
                .sort((a, b) => a.text.localeCompare(b.text))
                .value();
        },
        filteredAndLimitedItems() {
            return this.filteredItems.filter((item, itemIdx, items) => {
                let numItems = items.length - 1;
                let idxFrom = this.selected_idx - 3;
                let idxTo = this.selected_idx + 3;
                let isInRange = false;

                // Adjust the number of items before and after the selected item
                // when we reach either end of the list.
                // If we don't do this then this:
                // * Item 1
                // * item 2
                // * Item 3
                // * Item 4
                // * Item 5 < selected
                // Can turn into this:
                // * Item 4
                // * Item 5 < selected
                if (idxFrom < 0) {
                    idxTo += -idxFrom;
                    idxFrom = 0;
                } else if (idxTo > numItems) {
                    idxFrom -= (idxTo - numItems);
                    idxTo = numItems;
                }

                if (itemIdx >= idxFrom && itemIdx <= idxTo) {
                    isInRange = true;
                }

                // Keep track of the pre-limited index for item selection
                item.idx = itemIdx;

                return isInRange;
            });
        },
        selectedItem() {
            let item = this.filteredItems[this.selected_idx];
            return item || null;
        },
    },
    watch: {
        selected_idx() {
            // nextTick() as the DOM hasn't updated yet
            this.$nextTick(() => {
                let el = this.$el.querySelector('.kiwi-autocomplete-item--selected');
                if (!el) {
                    return;
                }

                this.$el.scrollTop = el.offsetTop - (el.getBoundingClientRect().height * 2);
            });

            this.tempCurrentItem();
        },
        filter() {
            let numItems = this.filteredAndLimitedItems.length - 1;
            if (this.selected_idx > numItems) {
                this.selected_idx = numItems;
            }
        },
    },
    mounted() {
        this.tempCurrentItem();
    },
    methods: {
        handleOnKeyDown(event) {
            let handled = false;

            let cancelKeyCodes = [
                13, // return
                32, // space
                186, // semi-colon
                188, // comma
                190, // period
            ];

            if (cancelKeyCodes.indexOf(event.keyCode) > -1) {
                // If no item is selected (ie. on an empty list), leave the return key
                // to do its default action as if the autocomplete box isn't active.
                if (!this.selectedItem) {
                    this.cancel();
                } else {
                    this.selectCurrentItem();
                    if (event.keyCode === 13) {
                        event.preventDefault();
                    }
                    handled = true;
                }
            } else if (event.keyCode === 38 || (event.keyCode === 9 && event.shiftKey)) {
                // Up or tab + shift
                if (this.selected_idx > 0) {
                    this.selected_idx--;
                } else {
                    // Wrap around to the end
                    this.selected_idx = this.filteredItems.length - 1;
                }

                event.preventDefault();
                handled = true;
            } else if ((event.keyCode === 40 && !event.altKey) || event.keyCode === 9) {
                // Down or tab
                if (this.selected_idx < this.filteredItems.length - 1) {
                    this.selected_idx++;
                } else {
                    // Wrap around to the start
                    this.selected_idx = 0;
                }

                event.preventDefault();
                handled = true;
            } else if (event.keyCode === 16) {
                // shift
                handled = true;
            } else if (event.keyCode === 33 || event.keyCode === 34) {
                // pageUp || pageDown
                let maxIdx = this.filteredItems.length - 1;
                let jump = 7;

                // current position is within the first or last 3
                // correctly jump the right ammount
                if (this.selected_idx < 4) {
                    jump = 10 - this.selected_idx;
                } else if (this.selected_idx > maxIdx - 4) {
                    jump = 10 - (maxIdx - this.selected_idx);
                }

                // backwards or forward
                if (event.keyCode === 33) {
                    this.selected_idx -= jump;
                } else {
                    this.selected_idx += jump;
                }

                // ensure we are not out of bounds
                if (this.selected_idx > maxIdx) {
                    this.selected_idx = maxIdx;
                } else if (this.selected_idx < 0) {
                    this.selected_idx = 0;
                }

                handled = true;
            }

            return handled;
        },
        openQuery(nick) {
            let buffer = this.$state.addBuffer(this.buffer.networkid, nick);
            this.$state.setActiveBuffer(buffer.networkid, buffer.name);
            this.cancel();
        },
        tempCurrentItem() {
            let item = this.selectedItem;
            if (!item) {
                return;
            }
            this.$emit('temp', item.value || item.text, item);
        },
        selectCurrentItem() {
            let item = this.selectedItem;
            let value = '';

            if (item) {
                value = item.value || item.text;
            }

            this.$emit('selected', value, item);
        },
        cancel() {
            this.$emit('cancel');
        },
    },
};
</script>

<style>

.kiwi-autocomplete {
    box-sizing: border-box;
    overflow-y: auto;
    position: absolute;
    bottom: 100%;
    right: 0;
    left: 0;
    z-index: 1;
    max-height: 300px;
}

.kiwi-autocomplete-item {
    padding: 5px 2em;
}

.kiwi-autocomplete-item-value {
    font-weight: bold;
}

.kiwi-autocomplete-item-action {
    float: right;
    font-size: 0.9em;
}

</style>
