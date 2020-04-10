<template>
    <div
        :class="[is_usermenu_open?'kiwi-statebrowser-usermenu--open':'']"
        class="kiwi-statebrowser-usermenu"
    >
        <div
            :class="[isConnected ?
                'kiwi-statebrowser-usermenu-avatar--connected' :
                'kiwi-statebrowser-usermenu-avatar--disconnected'
            ]"
            class="kiwi-statebrowser-usermenu-avatar"
            @click="is_usermenu_open=!is_usermenu_open"
        >
            {{ userInitial }}
            <away-status-indicator
                v-if="network && network.state === 'connected'"
                :network="network"
                :user="getUser"
                :toggle="false"
            />
        </div>
        <div v-if="is_usermenu_open" class="kiwi-statebrowser-usermenu-body">
            <p> {{ $t('state_remembered') }} </p>
            <a class="u-link" @click="clickForget">{{ $t('state_forget') }}</a>
            <div class="kiwi-close-icon" @click="is_usermenu_open=false">
                <i class="fa fa-times" aria-hidden="true" />
            </div>
        </div>
        <div v-else class="kiwi-statebrowser-usermenu-network">
            {{ networkName }}
        </div>
    </div>
</template>
<script>

'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import state from '@/libs/state';
import AwayStatusIndicator from './AwayStatusIndicator';

export default {
    components: {
        AwayStatusIndicator,
    },
    props: ['network'],
    data() {
        return {
            is_usermenu_open: false,
        };
    },
    computed: {
        userInitial() {
            let initial = 'U';
            if (this.network && this.network.nick) {
                initial = this.network.nick.charAt(0).toUpperCase();
            }
            return initial;
        },
        networkName() {
            let name = TextFormatting.t('no_network');
            if (this.network) {
                name = this.network.name;
            }
            return name;
        },
        getUser() {
            return this.network ?
                this.network.currentUser() :
                null;
        },
        isConnected() {
            return this.network && this.network.state === 'connected';
        },
    },
    methods: {
        clickForget() {
            let msg = 'This will delete all stored networks and start fresh. Are you sure?';
            /* eslint-disable no-restricted-globals, no-alert */
            let confirmed = confirm(msg);
            if (!confirmed) {
                return;
            }

            state.persistence.forgetState();
            window.location.reload();
        },
    },
};

</script>

<style>

.kiwi-statebrowser-usermenu {
    width: 100%;
    padding-bottom: 0;
    padding-top: 34px;
}

.kiwi-statebrowser-usermenu-network {
    padding: 0 0 10px 0;
    cursor: default;
}

.kiwi-statebrowser-usermenu-avatar {
    width: 50px;
    height: 50px;
    cursor: pointer;
    font-size: 1.5em;
    text-align: center;
    line-height: 50px;
    border: 2px solid;
    border-radius: 50%;
    margin: 0 auto 10px auto;
    transition: background 0.2s;
    position: relative;
}

.kiwi-statebrowser-usermenu .kiwi-awaystatusindicator {
    position: absolute;
    top: 1px;
    right: -5px;
    width: 12px;
    height: 12px;
    border: 1px solid #000;
}

.kiwi-statebrowser-usermenu-body {
    width: 100%;
    box-sizing: border-box;
    padding: 0 10px;
    font-size: 0.8em;
    margin-bottom: 10px;
}

.kiwi-statebrowser-usermenu-body p {
    margin-bottom: 0;
}
</style>
