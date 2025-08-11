<template>
    <div class="kiwi-settings-advanced">
        <div class="kiwi-settings-advanced-notice">{{ $t('settings_advanced_header') }}</div>
        <form class="u-form">
            <div class="kiwi-settings-advanced-filter">
                <input
                    v-model="filterString"
                    :placeholder="$t('settings_advanced_filter')"
                    class="u-input"
                >
                <i v-if="!filterString" class="fa fa-search" aria-hidden="true" />
                <i v-else class="fa fa-times" aria-hidden="true" @click="filterString = ''" />
            </div>
            <div v-if="filteredSettings.length === 0" class="kiwi-settings-advanced-empty">
                "{{ filterString }}" {{ $t('not_found') }}
            </div>
            <div v-else class="kiwi-settings-advanced-table">
                <template v-for="setting in filteredSettings">
                    <div :key="`label-${setting.key}`" class="kiwi-settings-advanced-key">
                        <label
                            :for="`setting-${setting.key}`"
                        >{{ setting.key }}</label>
                    </div>
                    <div :key="`reset-${setting.key}`" class="kiwi-settings-advanced-reset">
                        <a
                            class="u-link"
                            :class="{ 'kiwi-settings-advanced--modified': setting.modified }"
                            @click="resetValue($event, setting.key)"
                        >
                            <span class="kiwi-settings-advanced-reset-text">
                                {{ $t('settings_advanced_reset') }}
                            </span>
                            <i class="fa fa-undo" />
                        </a>
                    </div>
                    <div :key="`value-${setting.key}`" class="kiwi-settings-advanced-value">
                        <input
                            v-if="setting.type === 'boolean'"
                            :id="`setting-${setting.key}`"
                            :checked="setting.val"
                            type="checkbox"
                            @change="updateSetting($event, setting.key)"
                        >
                        <input
                            v-else-if="setting.type === 'number'"
                            :id="`setting-${setting.key}`"
                            :value="setting.val"
                            class="u-input"
                            type="number"
                            @keydown.13="$event.target.blur()"
                            @change="updateSetting($event, setting.key)"
                            @blur="updateSetting($event, setting.key)"
                        >
                        <input
                            v-else
                            :id="`setting-${setting.key}`"
                            :value="setting.val"
                            class="u-input"
                            @keydown.13="$event.target.blur()"
                            @blur="updateSetting($event, setting.key)"
                        >
                    </div>
                </template>
            </div>
        </form>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';
import * as settingTools from '@/libs/settingTools';

export default {
    data: function data() {
        return {
            filterString: '',
        };
    },
    computed: {
        filteredSettings() {
            let settings = this.settings;
            let filter = this.filterString.toLowerCase();
            let out = [];
            Object.keys(settings).forEach((key) => {
                let value = settings[key];
                if (value.key.toLowerCase().indexOf(filter) !== -1) {
                    out.push(value);
                }
            });
            return out;
        },
        settings() {
            let out = {};
            let base = [];
            settingTools.buildTree(out, base, this.$state.getSetting('settings'), false);
            settingTools.buildTree(out, base, this.$state.getSetting('user_settings'), true);

            return _.orderBy(Object.keys(out).map((key) => out[key]), [
                (o) => o.key.split('.').length - 1,
                'key',
            ], ['asc']);
        },
    },
    methods: {
        resetValue(event, settingKey) {
            let newVal = this.$state.getSetting('settings.' + settingKey);
            if (!newVal) {
                newVal = null;
            }
            this.$state.setting(settingKey, newVal);
        },
        updateSetting(event, settingKey) {
            let target = event.target;
            let val = target.type === 'checkbox' ? target.checked : target.value;
            switch (target.type) {
            case 'checkbox':
                val = target.checked;
                break;
            case 'number':
                val = parseInt(target.value, 10);
                break;
            default:
                val = target.value;
                break;
            }
            if (this.$state.setting(settingKey) === val) {
                return;
            }

            this.$state.setting(settingKey, val);
        },
    },
};
</script>

<style lang="less">
.kiwi-settings-advanced .u-form {
    input,
    input[type='checkbox'] {
        margin: 0;
    }
}

.kiwi-settings-advanced-notice {
    text-align: center;
    padding: 10px;
    margin: 5px 0 15px 0;
    font-weight: 900;
}

.kiwi-settings-advanced-filter {
    position: relative;
    display: inline-block;

    width: min(50%, 300px);

    input {
        width: 100%;
    }

    input::-ms-clear {
        display: none;
    }

    .fa {
        position: absolute;
        top: 8px;
        right: 10px;
        z-index: 10;
        cursor: default;

        &.fa-times {
            cursor: pointer;
        }
    }
}

.kiwi-settings-advanced-empty {
    width: 100%;
    margin: 50px 0 30px 0;
    text-align: center;
    font-weight: 900;
    font-size: 1em;
}

.kiwi-settings-advanced-table {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr max-content 1fr;
    grid-auto-rows: minmax(30px, max-content);

    > div {
        display: flex;
        align-items: center;
        padding: 0 10px;
        height: 100%;
        box-sizing: border-box;
    }

    .u-input {
        width: 100%;
        padding: 2px 4px;
    }

    .kiwi-settings-advanced-key {
        padding: 4px 10px;
        overflow: hidden;

        label {
            margin: 0;
            max-width: 100%;
            overflow-wrap: break-word;
        }
    }

    .kiwi-settings-advanced-reset a {
        visibility: hidden;
    }

    a.kiwi-settings-advanced--modified {
        visibility: visible;
    }

    .kiwi-settings-advanced-reset-text {
        margin-right: 4px;
        font-weight: 600;
    }
}

@media screen and (max-width: 1100px) {
    .kiwi-settings-advanced-table {
        grid-template-columns: 1fr max-content;
        grid-auto-flow: row dense;

        .kiwi-settings-advanced-key {
            grid-column: span 2;
        }

        .kiwi-settings-advanced-reset {
            grid-column: 2;
        }

        .kiwi-settings-advanced-value {
            grid-column: 1;
        }

        > div:nth-child(3n+1) {
            padding-top: 8px;
            padding-bottom: 8px;
        }

        > div:nth-child(3n+2),
        > div:nth-child(3n+3) {
            padding-bottom: 8px;
        }
    }
}

@media screen and (max-width: 769px) {
    .kiwi-settings-advanced-filter {
        width: 100%;
    }

    .kiwi-settings-advanced-table {
        > div:nth-child(3n+2) {
            padding-left: 4px;
            padding-right: 8px;
        }

        > div:nth-child(3n+3) {
            padding-right: 4px;
        }

        .kiwi-settings-advanced-reset-text {
            display: none;
        }

        .kiwi-settings-advanced-reset a {
            padding: 0 4px;
        }
    }
}
</style>
