<template>
    <div class="kiwi-settings-advanced">
        <form class="u-form">
            <div>{{ $t('settings_advanced_header') }}</div>
            <table class="kiwi-settings-advanced-table">
                <tr>
                    <th style="min-width: 300px;">{{ $t('settings_advanced_name') }}</th>
                    <th style="min-width: 86px;">{{ $t('settings_advanced_status') }}</th>
                    <th style="min-width: 400px;">{{ $t('settings_advanced_value') }}</th>
                </tr>
                <tr v-for="setting in getSettings"
                    :key="setting.key"
                    :style="{'font-weight': (setting.status === 'modified') ? 'bold' : 'normal' }">
                    <td>{{ setting.key }}</td>
                    <td>{{ $t('settings_advanced_' + setting.status) }}
                        <i v-if="setting.status === 'modified'"
                           class="fa fa-undo"
                           style="float: right; cursor: pointer;"
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
                               @keydown="keyDown($event)"
                               @change="updateSetting($event, setting.key)"
                               @blur="updateSetting($event, setting.key)">
                        <input v-else
                               :value="setting.val"
                               class="u-input"
                               @keydown="keyDown($event)"
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
            ignoreKeys: ['emojis', 'themes', 'bnc', 'aliases', 'restricted',
                'hide_advanced', 'windowTitle', 'startupOptions'],
        };
    },
    computed: {
        getSettings() {
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
            state.setting(settingKey, state.getSetting('settings.' + settingKey));
        },
        keyDown(event) {
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
            /* eslint-disable guard-for-in, no-restricted-syntax */
            for (let key in object) {
                let ourBase = base.concat([key]);
                let val = object[key];
                if (['string', 'boolean', 'number'].includes(typeof val)) {
                    if (this.ignoreKeys.includes(key) ||
                     (ourBase[0] && this.ignoreKeys.includes(ourBase[0]))) {
                        continue;
                    }
                    if (!data[ourBase.join('.')] || data[ourBase.join('.')].val !== val) {
                        data[ourBase.join('.')] = {
                            key: ourBase.join('.'),
                            val: val,
                            type: typeof val,
                            status: status,
                        };
                    }
                } else if (typeof val === 'object') {
                    this.buildTree(data, ourBase, object[key], status);
                }
            }
        },
        bindSetting(settingName) {
            return {
                get: function settingGetter() {
                    return state.setting(settingName);
                },
                set: function settingSetter(newVal) {
                    state.setting(settingName, newVal);
                },
            };
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

.kiwi-settings-advanced-table th,
td {
    padding: 0 10px;
}

</style>
