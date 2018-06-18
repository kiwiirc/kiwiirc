<template>
    <div class="kiwi-fallback-container">
        <h4>{{$t('container_welcome')}}</h4>
        <a @click.stop="toggleStateBrowser" class="u-button">{{$t('container_statebrowser')}}</a>
    </div>
</template>

<script>

import state from '@/libs/state';

export default {
    methods: {
        toggleStateBrowser: function toggleStateBrowser() {
            state.$emit('statebrowser.toggle');
        },
    },
};
</script>

<style>
.kiwi-fallback-container {
    text-align: center;
    padding: 1em;
}

.kiwi-fallback-container .u-button {
    border-radius: 3px;
    font-weight: 500;
    line-height: 50px;
    padding: 0 14px;
}
</style>
