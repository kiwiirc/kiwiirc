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
                    <div :key="'label-' + setting.key" class="kiwi-settings-advanced-key">
                        <label
                            :for="'setting-' + setting.key"
                        >{{ setting.key }}</label>
                    </div>
                    <div :key="'reset-' + setting.key" class="kiwi-settings-advanced-modified">
                        <a
                            class="u-link"
                            :class="{'kiwi-settings-advanced--modified': setting.modified}"
                            @click="resetValue($event, setting.key)"
                        >
                            {{ $t('settings_advanced_reset') }}
                            <i class="fa fa-undo" style="margin-left: 10px;" />
                        </a>
                    </div>
                    <div :key="'value-' + setting.key" class="kiwi-settings-advanced-value">
                        <input
                            v-if="setting.type === 'boolean'"
                            :id="'setting-' + setting.key"
                            :checked="setting.val"
                            type="checkbox"
                            @change="updateSetting($event, setting.key)"
                        >
                        <input
                            v-else-if="setting.type === 'number'"
                            :id="'setting-' + setting.key"
                            :value="setting.val"
                            class="u-input"
                            type="number"
                            @keydown.13="$event.target.blur()"
                            @change="updateSetting($event, setting.key)"
                            @blur="updateSetting($event, setting.key)"
                        >
                        <input
                            v-else
                            :id="'setting-' + setting.key"
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
.kiwi-settings-advanced-notice {
    text-align: center;
    padding: 10px 0;
    margin: 5px 0 15px 0;
    font-weight: 900;
}

.kiwi-settings-advanced-filter {
    position: relative;
    display: inline-block;

    width: min(30%, 300px);

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
    grid-template-rows: auto;

    > div {
        padding-right: 20px;
        height: 100%;
    }

    > div:nth-child(3n) {
        padding-right: 10px;
    }

    .kiwi-settings-advanced-key,
    .kiwi-settings-advanced-modified {
        display: flex;
        align-items: center;
        padding-left: 10px;
    }

    .kiwi-settings-advanced-key label {
        margin: 0;
    }

    .kiwi-settings-advanced-modified a {
        visibility: hidden;
    }

    a.kiwi-settings-advanced--modified {
        visibility: visible;
    }

    .kiwi-settings-advanced-value .u-input {
        width: 100%;
        padding: 1px 4px;
        margin: 4px 0;
    }
}

@media screen and (max-width: 1100px) {
    .kiwi-settings-advanced-table {
        grid-template-columns: 1fr max-content;

        .kiwi-settings-advanced-value {
            grid-column: span 2;
        }

        > div {
            box-sizing: border-box;
            padding: 0 10px 8px 10px;
        }

        > div:nth-child(3n+1) {
            padding-top: 8px;
        }
    }
}

@media screen and (max-width: 769px) {
    .kiwi-settings-advanced-table {
        display: flex;
        flex-direction: column;

        > div:nth-child(3n+3) {
            padding-bottom: 8px;
        }
    }
}
</style>
