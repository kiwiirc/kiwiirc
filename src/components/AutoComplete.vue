<template>
    <div class="kiwi-autocomplete kiwi-theme-bg">
        <div
            v-for="item in filteredAndLimitedItems"
            :key="item.type + item.text"
            :class="[
                'kiwi-autocomplete-item',
                `kiwi-autocomplete-type--${item.type ? item.type : 'default'}`,
                { 'kiwi-autocomplete-item--selected': item.idx === selected_idx },
            ]"
            @mousedown.prevent
            @click="handleClick(item)"
        >
            <span class="kiwi-autocomplete-item-value">{{ item.text }}</span>
            <span
                v-if="item.type === 'command'"
                class="u-link kiwi-autocomplete-item-details"
            >{{ item.description }}</span>
            <span
                v-else-if="item.type === 'user'"
                class="u-link kiwi-autocomplete-item-details"
                @click.stop="openQuery(item.text)"
            >{{ $t('send_message') }}</span>
            <span
                v-else-if="item.type === 'channel'"
                class="kiwi-autocomplete-item-details"
            ><i class="fa fa-user" aria-hidden="true" />{{ item.count }}</span>
        </div>
    </div>
</template>

<script>
'kiwi public';

import * as Misc from '@/helpers/Misc';

export default {
    props: ['filter', 'buffer', 'items', 'itemsPerPage'],
    data() {
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
        itemLimits() {
            const itemLimit = parseInt(this.itemsPerPage, 10) || 7;
            const halfLimit = (itemLimit - 1) / 2;
            return {
                all: itemLimit,
                backward: Math.floor(halfLimit) || 1,
                forward: Math.ceil(halfLimit) || 1,
            };
        },
        filteredItems() {
            const filterVal = (this.filter || '').toLowerCase();

            return this.items.filter((item) => {
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
            }).sort(Misc.strCompare);
        },
        filteredAndLimitedItems() {
            return this.filteredItems.filter((item, itemIdx, items) => {
                let numItems = items.length - 1;
                let idxFrom = this.selected_idx - this.itemLimits.backward;
                let idxTo = this.selected_idx + this.itemLimits.forward;
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
            const numItems = this.filteredAndLimitedItems.length - 1;
            if (this.selected_idx > numItems) {
                this.selected_idx = (numItems < 0) ? 0 : numItems;
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
                'Enter', // return
                ' ', // space
                ';', // semi-colon
                ',', // comma
                '.', // period
            ];

            if (cancelKeyCodes.indexOf(event.key) > -1) {
                // If no item is selected (ie. on an empty list), leave the return key
                // to do its default action as if the autocomplete box isn't active.
                if (!this.selectedItem) {
                    this.cancel();
                } else {
                    this.selectCurrentItem();
                    if (event.key === 'Enter') {
                        event.preventDefault();
                    }
                    handled = true;
                }
            } else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
                // Up or tab + shift
                if (this.selected_idx > 0) {
                    this.selected_idx--;
                } else {
                    // Wrap around to the end
                    this.selected_idx = this.filteredItems.length - 1;
                }

                event.preventDefault();
                handled = true;
            } else if ((event.key === 'ArrowDown' && !event.altKey) || event.key === 'Tab') {
                // Down or tab
                if (this.selected_idx < this.filteredItems.length - 1) {
                    this.selected_idx++;
                } else {
                    // Wrap around to the start
                    this.selected_idx = 0;
                }

                event.preventDefault();
                handled = true;
            } else if (event.key === 'Shift') {
                // shift
                handled = true;
            } else if (event.key === 'PageUp' || event.key === 'PageDown') {
                // pageUp || pageDown
                const maxIdx = this.filteredItems.length - 1;
                const limits = this.itemLimits;
                let jump = limits.all;

                // current position is within the first or last 3
                // correctly jump the right amount
                if (this.selected_idx <= limits.backward) {
                    jump = (limits.all + limits.backward) - this.selected_idx;
                } else if (this.selected_idx >= maxIdx - limits.forward) {
                    // the center point maybe offset if an even number of items is shown
                    jump = (limits.all + limits.forward) - (maxIdx - this.selected_idx);
                }

                // backwards or forward
                if (event.key === 'PageUp') {
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
        handleClick(item) {
            this.selected_idx = item.idx;
            this.selectCurrentItem();
            this.$emit('click', item.value || item.text, item);
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

<style lang="less">
.kiwi-autocomplete {
    box-sizing: border-box;
    overflow-y: auto;
    position: absolute;
    bottom: 100%;
    right: 0;
    left: 0;
    z-index: 1;
}

.kiwi-autocomplete-item {
    padding: 5px 2em;
    cursor: pointer;
}

.kiwi-autocomplete-item-value {
    font-weight: 700;
}

.kiwi-autocomplete-type--command {
    .kiwi-autocomplete-item-details {
        margin-left: 8px;
    }
}

.kiwi-autocomplete-type--user {
    .kiwi-autocomplete-item-details {
        float: right;
        font-size: 0.9em;
    }
}

.kiwi-autocomplete-type--channel {
    .kiwi-autocomplete-item-details {
        float: right;
        font-size: 0.9em;
        width: 3em;
    }

    .fa-user {
        margin-right: 4px;
    }
}

@supports (grid-template-rows: subgrid) {
    .kiwi-autocomplete {
        display: grid;
        column-gap: 8px;
        grid-template-columns: minmax(7em, max-content) auto max-content;
    }

    .kiwi-autocomplete-item {
        display: grid;
        grid-column: span 3;
        grid-template-columns: subgrid;
    }

    .kiwi-autocomplete-type--command {
        .kiwi-autocomplete-item-details {
            margin-left: unset;
            grid-column: span 2;
        }
    }

    .kiwi-autocomplete-type--user,
    .kiwi-autocomplete-type--channel {
        .kiwi-autocomplete-item-value {
            grid-column: span 2;
        }

        .kiwi-autocomplete-item-details {
            float: unset;
        }
    }

    .kiwi-autocomplete-type--default {
        .kiwi-autocomplete-item-value {
            grid-column: span 3;
        }
    }
}
</style>
