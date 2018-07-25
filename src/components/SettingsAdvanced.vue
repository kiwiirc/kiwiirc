<template>
    <div class="kiwi-settings-advanced">
        <div class="kiwi-settings-advanced-notice">{{ $t('settings_advanced_header') }}</div>
        <form class="u-form">
            <div>
                <span>{{ $t('settings_filter') }}:</span>
                <input v-model="filterString">
                <i v-if="filterString"
                   class="fa fa-times"
                   style="cursor: pointer;"
                   @click="filterString = ''"/>
            </div>
            <table class="u-table kiwi-settings-advanced-table" cellspacing="0">
                <thead>
                    <th>{{ $t('settings_advanced_name') }}</th>
                    <th>{{ $t('settings_advanced_status') }}</th>
                    <th style="min-width: 400px;">{{ $t('settings_advanced_value') }}</th>
                </thead>
                <tr v-for="setting in filteredSettings"
                    :key="setting.key"
                    :style="{'font-weight': (setting.status === 'modified') ? 'bold' : 'normal' }">
                    <td>{{ setting.key }}</td>
                    <td>{{ $t('settings_advanced_' + setting.status) }}
                        <i v-if="setting.status === 'modified'"
                           class="fa fa-undo reset-icon"
                           style="cursor: pointer;"
                           @click="resetValue($event, setting.key)"/>
                    </td>
                    <td>
                        <input v-if="setting.type === 'boolean'"
                               :checked="setting.val"
                               type="checkbox"
                               @click="updateSetting($event, setting.key)">
                        <input v-else-if="setting.type === 'number'"
                               :value="setting.val"
                               class="u-input"
                               type="number"
                               @keydown.13="$event.target.blur()"
                               @change="updateSetting($event, setting.key)"
                               @blur="updateSetting($event, setting.key)">
                        <input v-else
                               :value="setting.val"
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
            this.buildTree(out, base, state.getSetting('settings'), 'default');
            this.buildTree(out, base, state.getSetting('user_settings'), 'modified');

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
        buildTree(data, base, object, status) {
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
                            status: status,
                        };
                    }
                } else if (typeof value === 'object') {
                    this.buildTree(data, ourBase, value, status);
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

.kiwi-settings-advanced .u-input {
    height: auto;
}

.kiwi-settings-advanced-notice {
    text-align: center;
    padding: 10px 0;
    border: 1px solid #fff;
    margin: 0 0 10px 0;
    border-radius: 2px;
}

@media screen and (max-width: 600px) {
    .u-form {
        overflow-x: scroll;
    }
}

</style>
