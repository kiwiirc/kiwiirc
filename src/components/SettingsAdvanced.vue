<template>
    <div class="kiwi-settings-advanced">
        <div class="kiwi-settings-advanced-notice">{{ $t('settings_advanced_header') }}</div>
        <form class="u-form">
            <div class="kiwi-settings-advanced-filter">
                <div class="kiwi-settings-filter-container">
                    <input id="filter" v-model="filterString" class="u-input" v-bind:placeholder="$t('settings_advanced_filter')">
                    <i class="fa fa-search" aria-hidden="true"></i>
                </div>
                <i v-if="filterString"
                   class="fa fa-times"
                   style="cursor: pointer;"
                   @click="filterString = ''"/>
            </div>
            <table class="u-table kiwi-settings-advanced-table" cellspacing="0">
                <p v-if="!filteredSettings">No results found, sorry. </p>
                <tr v-for="setting in filteredSettings"
                    :key="setting.key"
                    :style="{'font-weight': (setting.modified) ? 'bold' : 'normal' }">
                    <td><label :for="setting.key">{{ setting.key }}</label></td>
                    <td v-if="setting.modified">
                        <a class="u-link" @click="resetValue($event, setting.key)">
                            {{ $t('settings_advanced_reset') }}
                            <i class="fa fa-undo reset-icon" style="margin-left: 10px;"/>
                        </a>
                    </td>
                    <td v-else />
                    <td>
                        <input v-if="setting.type === 'boolean'"
                               :checked="setting.val"
                               :id="setting.key"
                               type="checkbox"
                               @click="updateSetting($event, setting.key)">
                        <input v-else-if="setting.type === 'number'"
                               :value="setting.val"
                               :id="setting.key"
                               class="u-input"
                               type="number"
                               @keydown.13="$event.target.blur()"
                               @change="updateSetting($event, setting.key)"
                               @blur="updateSetting($event, setting.key)">
                        <input v-else
                               :value="setting.val"
                               :id="setting.key"
                               class="u-input"
                               @keydown.13="$event.target.blur()"
                               @blur="updateSetting($event, setting.key)">
                    </td>
                </tr>
            </table>
        </form>
    </div>
</template>

<script>

import state from '@/libs/state';
import _ from 'lodash';

export default {
    data: function data() {
        return {
            filterString: '',
            ignoreKeys: ['emojis', 'themes', 'bnc', 'aliases', 'restricted',
                'hide_advanced', 'windowTitle', 'startupOptions', 'plugins'],
        };
    },
    computed: {
        filteredSettings() {
            let settings = this.settings;
            let out = [];
            Object.values(settings).forEach((value, index) => {
                if (value.key.toLowerCase().includes(this.filterString.toLowerCase())) {
                    out.push(value);
                }
            });
            return out;
        },
        settings() {
            let out = {};
            let base = [];
            this.buildTree(out, base, state.getSetting('settings'), false);
            this.buildTree(out, base, state.getSetting('user_settings'), true);

            return _.orderBy(Object.values(out), [
                o => o.key.split('.').length - 1,
                'key',
            ], ['asc']);
        },
    },
    methods: {
        resetValue(event, settingKey) {
            let newVal = state.getSetting('settings.' + settingKey);
            if (!newVal) {
                newVal = null;
            }
            state.setting(settingKey, newVal);
        },
        blurOnEnter(event) {
            if (event.keyCode === 13) {
                event.target.blur();
            }
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
            if (state.setting(settingKey) === val) {
                return;
            }

            state.setting(settingKey, val);
        },
        buildTree(data, base, object, modified) {
            Object.entries(object).forEach(([key, value]) => {
                let ourBase = base.concat([key]);
                if (['string', 'boolean', 'number'].includes(typeof value)) {
                    if (this.ignoreKeys.includes(key) ||
                     (ourBase[0] && this.ignoreKeys.includes(ourBase[0]))) {
                        return;
                    }

                    if (!data[ourBase.join('.')] || data[ourBase.join('.')].val !== value) {
                        data[ourBase.join('.')] = {
                            key: ourBase.join('.'),
                            val: value,
                            type: typeof value,
                            modified: modified,
                        };
                    }
                } else if (typeof value === 'object') {
                    this.buildTree(data, ourBase, value, modified);
                }
            });
        },
    },
};
</script>

<style>

.kiwi-appsettings-block-advanced {
    max-width: inherit;
    margin: 20px;
}

.kiwi-settings-advanced {
    width: 100%;
}

.kiwi-settings-advanced-table .u-input {
    border-bottom: 2px solid red;
    height: auto;
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

.kiwi-settings-advanced .u-table td .u-input {
    height: 30px;
}

.kiwi-settings-advanced-filter {
    border-bottom: 1px solid rgba(128, 128, 128, 0.5);
    padding: 0 0 5px 0;
}

.kiwi-settings-filter-container {
    position: relative;
    max-width: 224px;
}

.kiwi-settings-filter-container .fa-search {
    position: absolute;
    top: 12px;
    right: 10px;
    z-index: 10;
    cursor: default;
}

.kiwi-settings-advanced-filter label {
    font-weight: 600;
}

.u-form .kiwi-settings-advanced-filter .u-input {
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

@media screen and (max-width: 600px) {
    .u-form {
        overflow-x: scroll;
    }
}

</style>
