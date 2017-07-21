<template>
    <div class="kiwi-welcome">
        <h2>Kiwi IRC BNC</h2>
        <div v-if="statusMessage">
            {{statusMessage}}
        </div>
        <form v-on:submit.prevent="startUp" class="u-form kiwi-welcome-form">
            <label>
                <span>{{$t('username')}}</span>
                <input type="text" v-model="username" />
            </label>
            <label>
                <span>{{$t('password')}}</span>
                <input type="password" v-model="password" />
            </label>

            <button type="submit" class="u-button u-button-primary u-submit">{{$t('connect')}}</button>
        </form>
    </div>
</template>

<script>

import ServerSession from 'src/libs/ServerSession';
import state from 'src/libs/state';
import logger from 'src/libs/Logger';

export default {
    data: function data() {
        return {
            username: '',
            password: '',
            statusMessage: '',
        };
    },
    methods: {
        startUp: function startUp() {
            this.session = this.session || new ServerSession();
            this.statusMessage = 'Logging in...';

            this.session.auth(this.username, this.password)
            .then(() => this.session.getNetworks().then(this.sessionToState))
            .then(() => this.$emit('start'))
            .catch(err => {
                if (err && err.stack) {
                    this.statusMessage = 'Error logging in';
                    logger.error(err.stack);
                } else {
                    this.statusMessage = 'Invalid login';
                }
            });
        },

        sessionToState: function sessionToState(sessionNetworks) {
            // Expects sessionNetworks to be in the format of:
            // [
            //  {"buffers":[{"channel":"1","name":"#prawnsalad","joined":"1"}],
            //  "name":"freenode",
            //  "channel":"1",
            //  "connected":"1",
            //  "host":"irc.freenode.net",
            //  "port":"6667",
            //  "tls":"0",
            //  "nick":"notprawn99829"
            //  },
            // ]
            sessionNetworks.forEach(sessionNetwork => {
                let net = state.addNetwork(sessionNetwork.name, sessionNetwork.nick, {
                    channelId: sessionNetwork.channel,
                    server: sessionNetwork.host,
                    port: parseInt(sessionNetwork.port, 10),
                    tls: !!parseInt(sessionNetwork.tls, 10),
                    password: sessionNetwork.password || '',
                });

                sessionNetwork.buffers.forEach(sessionBuffer => {
                    let buffer = state.addBuffer(net.id, sessionBuffer.name);
                    if (!!parseInt(sessionBuffer.joined, 10)) {
                        buffer.enabled = true;
                    }
                });
            });
        },
    },
    created: function created() {
    },
};
</script>

<style>

.kiwi-welcome {
    text-align: center;
    margin-top: 1em;
}
.kiwi-welcome-start {
    font-size: 1.1em;
    cursor: pointer;
}
.kiwi-welcome-form {
    width: 300px;
    margin: 0 auto;
}
.kiwi-welcome-server-types {
    font-size: 0.9em;
}
.kiwi-welcome-server-types a {
    margin: 0 1em;
}
</style>
