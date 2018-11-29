<template>
    <div id="kiwi-component-container">
        <div id="kiwi-app"/>
    </div>
</template>

<script>
import Vue from 'vue';
import i18next from 'i18next';
import VueI18Next from '@panter/vue-i18next';
import App from '@/components/App';
import StartupError from '@/components/StartupError';
import Logger from '@/libs/Logger';
import ConfigLoader from '@/libs/ConfigLoader';
import GlobalApi from '@/libs/GlobalApi';
import * as common from '@/common.js';

let log = Logger.namespace('main');

// Add the global API as soon as possible so that things can start listening to it
let api = window.kiwi = GlobalApi.singleton();

function startApp() {
    api.emit('init');

    /* eslint-disable no-new */
    new Vue({
        el: '#kiwi-app',
        render: h => h(App),
        i18n: new VueI18Next(i18next),
    });

    api.emit('ready');
}

function showError(err) {
    if (err) {
        log.error('Error starting Kiwi IRC:', err);
    } else {
        log.error('Unknown error starting Kiwi IRC');
    }

    /* eslint-disable no-new */
    new Vue({
        el: '#kiwi-app',
        render: h => h(StartupError),
    });
}

export default{
    props: ['config'],
    mounted() {
        let configObj = this.config;
        let configLoader = new ConfigLoader();
        configLoader
            .addValueReplacement('hostname', window.location.hostname)
            .addValueReplacement('host', window.location.hostname)
            .addValueReplacement('host', window.location.host)
            .addValueReplacement('port', window.location.port || 80)
            .addValueReplacement('hash', (window.location.hash || '').substr(1))
            .addValueReplacement('query', (window.location.search || '').substr(1))
            .addValueReplacement('referrer', window.document.referrer);

        configLoader.loadFromObj(configObj)
            .then(common.applyConfig)
            .then(common.initState)
            .then(common.initInputCommands)
            .then(common.initLocales)
            .then(common.initThemes)
            .then(common.loadPlugins)
            .then(common.initSound)
            .then(startApp)
            .catch(showError);
    },
};
</script>

<style>
#kiwi-component-container {
    width: 100%;
    height: 100%;
    position: relative;
}
</style>
