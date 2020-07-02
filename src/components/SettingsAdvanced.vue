<template>
    <div class="kiwi-settings-advanced">
        <div class="kiwi-settings-advanced-notice">{{ $t('settings_advanced_header') }}</div>
        <form class="u-form">
            <div class="kiwi-settings-advanced-filter-container">
                <input v-model="filterString"
                       :placeholder="$t('settings_advanced_filter')"
                       class="u-input"
                >
                <i v-if="!filterString" class="fa fa-search" aria-hidden="true" />
                <i v-else class="fa fa-times" aria-hidden="true" @click="filterString = ''" />
            </div>
            <table class="u-table kiwi-settings-advanced-table" cellspacing="0">
                <tr v-if="filteredSettings.length === 0">
                    <td class="kiwi-settings-advanced-noresult">
                        {{ filterString }} - {{ $t('not_found') }}
                    </td>
                </tr>
                <tr v-for="setting in filteredSettings" v-else
                    :key="setting.key"
                    :class="{'kiwi-advanced-setting': !setting.modified,
                             'kiwi-advanced-setting--modified': setting.modified,
                    }"
                >
                    <td><label :for="'setting-' + setting.key">{{ setting.key }}</label></td>
                    <td v-if="setting.modified">
                        <a class="u-link" @click="resetValue($event, setting.key)">
                            {{ $t('settings_advanced_reset') }}
                            <i class="fa fa-undo" style="margin-left: 10px;" />
                        </a>
                    </td>
                    <td v-else />
                    <td>
                        <input v-if="setting.type === 'boolean'"
                               :id="'setting-' + setting.key"
                               :checked="setting.val"
                               type="checkbox"
                               @change="updateSetting($event, setting.key)"
                        >
                        <input v-else-if="setting.type === 'number'"
                               :id="'setting-' + setting.key"
                               :value="setting.val"
                               class="u-input"
                               type="number"
                               @keydown.13="$event.target.blur()"
                               @change="updateSetting($event, setting.key)"
                               @blur="updateSetting($event, setting.key)"
                        >
                        <input v-else
                               :id="'setting-' + setting.key"
                               :value="setting.val"
                               class="u-input"
                               @keydown.13="$event.target.blur()"
                               @blur="updateSetting($event, setting.key)"
                        >
                    </td>
                </tr>
            </table>
        </form>
    </div>
</template>

<script>
'kiwi public';

import * as settingTools from '@/libs/settingTools';
import _ from 'lodash';

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

<style>

.kiwi-settings-advanced {
    width: 100%;
}

.kiwi-settings-advanced-table .u-input {
    border-bottom: 2px solid red;
    height: auto;
    margin-top: 10px;
}

.kiwi-settings-advanced-table label {
    margin: 0;
}

.kiwi-settings-advanced-table td {
    height: 30px;
}

.kiwi-settings-advanced-table td:nth-child(2) {
    min-width: 100px;
}

.kiwi-settings-advanced-table td:nth-child(3) {
    min-width: 350px;
}

.kiwi-settings-advanced tr.kiwi-advanced-setting--modified {
    font-weight: 900;
}

.kiwi-settings-advanced .u-table td .u-input {
    height: 30px;
}

.kiwi-settings-advanced-filter {
    border-bottom: 1px solid rgba(128, 128, 128, 0.5);
    padding: 0 0 5px 0;
}

.kiwi-settings-advanced-filter-container {
    position: relative;
    display: inline-block;
}

.kiwi-settings-advanced-filter-container input::-ms-clear {
    display: none;
}

.kiwi-settings-advanced-filter-container .fa-search,
.kiwi-settings-advanced-filter-container .fa-times {
    position: absolute;
    top: 8px;
    right: 10px;
    z-index: 10;
    cursor: default;
}

.kiwi-settings-advanced-filter-container .fa-times {
    cursor: pointer;
}

.kiwi-settings-advanced-filter label {
    font-weight: 600;
}

.kiwi-settings-advanced .u-form .kiwi-settings-advanced-filter .u-input {
    display: inline-block;
    border: 1px solid #000;
    height: 40px;
    padding: 0 10px;
}

.kiwi-settings-advanced-notice {
    text-align: center;
    padding: 10px 0;
    margin: 5px 0 15px 0;
    font-weight: 900;
}

.kiwi-settings-advanced .kiwi-settings-advanced-noresult {
    width: 100%;
    margin: 50px 0 30px 0;
    text-align: center;
    font-weight: 900;
    font-size: 1em;
}

@media screen and (max-width: 600px) {
    .kiwi-settings-advanced .u-form {
        overflow-x: scroll;
    }
}

</style>
