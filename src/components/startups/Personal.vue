<template>
    <div class="kiwi-personal">
        <h1>{{ $t('personal_client') }}</h1>

        <div v-if="hasFragment">
            <div v-if="addedNetworkToExisting">
                <p>
                    {{ $t('personal_added_to_existing') }}
                </p>
            </div>
            <div v-else>
                <p>
                    {{ $t('personal_connect_to') }}
                    <span v-if="server && server.server">
                        <strong>{{ server.server }}</strong>
                    </span>
                </p>
                <button
                    v-if="hasOtherTab"
                    class="u-button u-button-primary"
                    @click="addNetworkToExistingTab"
                >
                    {{ $t('personal_add_existing_tab') }}
                </button> <br >
                <button
                    class="u-button u-button-primary"
                    @click="addTemporaryNetwork"
                >
                    {{ $t('personal_connect_temporary') }}
                </button> <br >
            </div>
        </div>
        <div v-else>
            <p>{{ $t('personal_addjoin') }}</p>
            <p>{{ $t('personal_return') }}</p>
            <button class="u-button u-button-primary" @click="addNetwork">
                {{ $t('personal_add') }}
            </button> <br >
        </div>
        <a
            v-if="networks.length>0"
            class="u-link kiwi-personal-existing-networks"
            @click.stop="toggleStateBrowser"
        >
            {{ $t('personal_saved') }}
        </a>
    </div>
</template>

<script>
'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import * as Misc from '@/helpers/Misc';
import state from '@/libs/state';
import IPC from '@/libs/IPC';

let firstRun = true;

export default {
    data: function data() {
        return {
            hasOtherTab: false,
            addedNetworkToExisting: false,
            server: null,
        };
    },
    computed: {
        networks() {
            return state.networks;
        },
        hasFragment() {
            return window.location.hash && window.location.hash.length > 1;
        },
    },
    created: async function created() {
        if (!firstRun) {
            return;
        }

        let server = this.hasFragment && this.parseFragment();
        this.server = server;
        if (server) {
            let hasOtherTab = await this.findOtherTabs();
            if (hasOtherTab) {
                this.hasOtherTab = true;
            } else {
                this.init();
            }
        } else {
            IPC.on('message', (e) => { // respond to other tabs that are looking
                let msg = e.data;
                if (msg.type === 'ping' && this.networks.length > 0) {
                    IPC.send({ type: 'pong' });
                } else if (msg.type === 'addNetwork' && !this.networks.find(n => n.name === msg.server)) {
                    let network = state.addNetwork(msg.server, msg.nick || ('Guest' + Math.floor(Math.random() * 100)), msg);
                    network.showServerBuffer('settings');
                }
            });
            this.init();
        }
        firstRun = false;
    },
    methods: {
        addNetwork() {
            if (firstRun) {
                this.init();
                firstRun = false;
            }
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = state.addNetwork(TextFormatting.t('new_network'), nick, {});
            network.showServerBuffer('settings');
        },
        async findOtherTabs() { // ping other tabs to try find one with added networks
            return new Promise((resolve, reject) => {
                const handleIPCMessage = (e) => {
                    let msg = e.data;
                    if (msg.type === 'pong') {
                        clearTimeout(timer);
                        resolve(true);
                    }
                };

                let timer = setTimeout((e) => {
                    IPC.removeListener('message', handleIPCMessage);
                    resolve(false);
                }, 200);

                IPC.on('message', handleIPCMessage);
                IPC.send({ type: 'ping' });
            });
        },
        addNetworkToExistingTab() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let con = this.parseFragment();

            state.addNetwork(TextFormatting.t('new_network'), nick, {});

            IPC.send({
                nick: nick,
                server: con.server,
                port: con.port,
                tls: con.tls,
                password: con.password || '',
                type: 'addNetwork',
            });
            this.addedNetworkToExisting = true;
        },
        addTemporaryNetwork() {
            if (this.hasFragment) {
                let con = this.parseFragment();

                state.persistence.storageKey = null;
                state.persistence.forgetState();

                if (!state.getNetworkFromAddress(con.server)) {
                    let network = state.addNetwork(con.server, con.nick || ('Guest' + Math.floor(Math.random() * 100)), {
                        server: con.server,
                        port: con.port,
                        tls: con.tls,
                        password: con.password || '',
                    });
                    network.showServerBuffer('settings');
                }

                window.location.hash = '';
                window.close();
            }
            this.$emit('start', {
                fallbackComponent: this.constructor,
            });
        },
        parseFragment() {
            if (window.location.hash.substr(1)) {
                let fragment = window.location.hash.substr(1);

                // Check to see if we're dealing with an encoded irc: uri (browsers do this
                // when clicking an IRC link)
                let uriCheck = fragment.substr(0, 7).toLowerCase();
                if (uriCheck === 'ircs%3a' || uriCheck.substr(0, 6) === 'irc%3a') {
                    fragment = decodeURIComponent(fragment);
                }

                let connections = Misc.parseIrcUri(fragment);
                let con = connections[0];
                return con;
            }
            return null;
        },
        toggleStateBrowser() {
            state.$emit('statebrowser.show');
        },
        async init() {
            // persist the buffers in the state by default
            let persistSetting = state.settings.startupOptions.remember_buffers;
            if (typeof persistSetting === 'undefined') {
                state.persistence.includeBuffers = true;
            } else {
                state.persistence.includeBuffers = !!persistSetting;
            }

            state.persistence.watchStateForChanges();

            // force restricted: false as users need access
            // to network settings to add a network
            state.setSetting('settings.restricted', false);

            this.$emit('start', {
                fallbackComponent: this.constructor,
            });
        },
    },
};
</script>

<style>

.kiwi-personal {
    box-sizing: border-box;
    height: 100%;
    overflow-y: auto;
    text-align: center;
    padding-top: 1em;
    font-size: 1.2em;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.kiwi-personal h1 {
    margin: 0 0 20px 0;
}

.kiwi-personal p {
    margin: 0 0 10px 0;
}

.kiwi-personal button {
    margin: 10px auto 0 auto;
    padding: 0 40px;
    font-size: 1em;
    line-height: 40px;
}

/* Only show the toggle state browser link if on a small screen */
.kiwi-personal-existing-networks {
    display: none;
}

@media screen and (max-width: 500px) {
    .kiwi-personal-existing-networks {
        display: inherit;
    }
}

</style>
