<template>
    <div class="kiwi-welcome-simple">
        <h2 v-html="greetingText"></h2>

        <template v-if="!network">
            <form @submit.prevent="formSubmit" class="u-form kiwi-welcome-simple-form">
                <input-text v-if="showNick" class="kiwi-welcome-simple-nick" :label="$t('nick')" v-model="nick" />
                <label v-if="showPass" class="kiwi-welcome-simple-have-password">
                    <input type="checkbox" v-model="show_password_box" /> {{$t('password_have')}}
                </label>
                <input-text v-if="show_password_box" class="kiwi-welcome-simple-password" :label="$t('password')" v-model="password" type="password" />
                <input-text v-if="showChannel" class="kiwi-welcome-simple-channel" :label="$t('channel')" v-model="channel" />
                <button
                    class="u-button u-button-primary u-submit kiwi-welcome-simple-start"
                    type="submit"
                    v-html="buttonText"
                    :disabled="!readyToStart"
                ></button>
            </form>
        </template>
        <template v-else-if="network.state !== 'connected'">
            <i class="fa fa-spin fa-spinner" style="font-size:2em; margin-top:1em;" aria-hidden="true"></i>
        </template>
        
    </div>
</template>

<script>

import _ from 'lodash';
import * as Misc from 'src/helpers/Misc';
import state from 'src/libs/state';

export default {
    data: function data() {
        return {
            network: null,
            channel: '',
            nick: '',
            password: '',
            showChannel: true,
            showPass: true,
            showNick: true,
            show_password_box: false,
        };
    },
    computed: {
        greetingText: function greetingText() {
            let greeting = state.settings.startupOptions.greetingText;
            return typeof greeting === 'string' ?
                greeting :
                'Welcome to Kiwi IRC!';
        },
        buttonText: function buttonText() {
            let greeting = state.settings.startupOptions.buttonText;
            return typeof greeting === 'string' ?
                greeting :
                'Start';
        },
        readyToStart: function readyToStart() {
            let ready = this.channel && this.nick;
            // Nicks cannot start with [0-9- ]
            // ? is not a valid nick character but we allow it as it gets replaced
            // with a number.
            if (!this.nick.match(/^[a-z_\\[\]{}^`|][a-z0-9_\-\\[\]{}^`|]*$/i)) {
                ready = false;
            }

            return ready;
        },
    },
    methods: {
        formSubmit: function formSubmit() {
            if (this.readyToStart) {
                this.startUp();
            }
        },
        startUp: function startUp() {
            let options = state.settings.startupOptions;

            let net = this.network = state.addNetwork('Network', this.nick, {
                server: _.trim(options.server),
                port: options.port,
                tls: options.tls,
                password: this.password,
                encoding: _.trim(options.encoding),
                direct: !!options.direct,
            });

            // Only switch to the first channel we join if multiple are being joined
            let hasSwitchedActiveBuffer = false;
            let bufferObjs = Misc.extractBuffers(this.channel);
            bufferObjs.forEach(bufferObj => {
                let newBuffer = state.addBuffer(net.id, bufferObj.name);
                newBuffer.enabled = true;

                if (newBuffer && !hasSwitchedActiveBuffer) {
                    state.setActiveBuffer(net.id, newBuffer.name);
                    hasSwitchedActiveBuffer = true;
                }

                if (bufferObj.key) {
                    newBuffer.key = bufferObj.key;
                }
            });

            net.ircClient.connect();
            let onRegistered = () => {
                this.$emit('start');
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            let onClosed = () => {
                setTimeout(() => { this.network = null; }, 1000);
                net.ircClient.off('registered', onRegistered);
                net.ircClient.off('close', onClosed);
            };
            net.ircClient.once('registered', onRegistered);
            net.ircClient.once('close', onClosed);
        },
        processNickRandomNumber: function processNickRandomNumber(nick) {
            // Replace ? with a random number
            let tmp = (nick || '').replace(/\?/g, () => Math.floor(Math.random() * 100).toString());
            return _.trim(tmp);
        },
    },
    created: function created() {
        let options = state.settings.startupOptions;

        this.nick = this.processNickRandomNumber(options.nick || '');
        this.password = options.password || '';
        this.channel = window.location.hash || options.channel || '';
        this.showChannel = typeof options.showChannel === 'boolean' ?
            options.showChannel :
            true;
        this.showNick = typeof options.showNick === 'boolean' ?
            options.showNick :
            true;

        if (options.autoConnect && this.nick && this.channel) {
            this.startUp();
        }
    },
};
</script>

<style>

.kiwi-welcome-simple {
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
}

</style>
