<template>
    <div class="kiwi-personal">
        <h1>{{ $t('personal_client') }}</h1>

        <div v-if="server && server.server && !readyToShowOptions" />
        <div v-else-if="server && server.server">
            <div v-if="addedNetworkToExisting">
                <p>
                    {{ $t('personal_added_to_existing') }}
                </p>
            </div>
            <div v-else>
                <p v-html="$t('personal_connect_to', { network: `<b>${server.server}</b>` })" />
                <button
                    v-if="hasOtherTab"
                    class="u-button u-button-primary"
                    @click="addNetworkToExistingTab"
                >
                    {{ $t('personal_add_existing_tab') }}
                </button>
                <button v-else class="u-button u-button-primary" @click="addNetwork()">
                    Add network to Kiwi
                </button>

                <br>
                <button
                    class="u-button u-button-primary"
                    @click="addNetwork(true)"
                >
                    {{ $t('personal_connect_temporary') }}
                </button> <br>
            </div>
        </div>
        <div v-else>
            <p>{{ $t('personal_addjoin') }}</p>
            <p>{{ $t('personal_return') }}</p>

            <button class="u-button u-button-primary" @click="addEmptyNetwork">
                {{ $t('personal_add') }}
            </button> <br>

            <a
                v-if="networks.length>0"
                class="u-link kiwi-personal-existing-networks"
                @click.stop="toggleStateBrowser"
            >
                {{ $t('personal_saved') }}
            </a>
        </div>
    </div>
</template>

<script>
'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import * as Misc from '@/helpers/Misc';
import BouncerProvider from '@/libs/BouncerProvider';
import IPC from '@/libs/IPC';

let firstRun = true;

export default {
    data: function data() {
        return {
            hasOtherTab: false,
            addedNetworkToExisting: false,
            server: null,
            readyToShowOptions: false,
        };
    },
    computed: {
        networks() {
            return this.$state.networks;
        },
        hasFragment() {
            return window.location.hash && window.location.hash.length > 1;
        },
    },
    created: function created() {
        this.$state.setting('allowRegisterProtocolHandler', true);

        let server = null;
        if (this.hasFragment) {
            server = this.parseFragment();
            this.server = server;
        }

        if (server) {
            this.findOtherTabs().then((hasOtherTab) => {
                if (hasOtherTab) {
                    this.hasOtherTab = true;
                    // Don't start the main kiwi app here as it's already open elsewhere
                } else {
                    this.listenForOtherTabs();
                    this.init();
                }

                this.readyToShowOptions = true;
            });
        } else {
            this.listenForOtherTabs();
            this.init();
        }
    },
    methods: {
        listenForOtherTabs() {
            IPC.on('message', (e) => { // respond to other tabs that are looking
                let msg = e.data;
                if (msg.type === 'ping' && this.networks.length > 0) {
                    IPC.send({ type: 'pong' });
                } else if (msg.type === 'addNetwork') {
                    let network = this.networks.find((n) => n.name === msg.server);
                    if (!network) {
                        network = this.$state.addNetwork(msg.server, msg.nick || ('Guest' + Math.floor(Math.random() * 100)), msg);
                    }
                    network.showServerBuffer('settings');
                }
            });
        },
        addEmptyNetwork() {
            let nick = 'Guest' + Math.floor(Math.random() * 100);
            let network = this.$state.addNetwork(TextFormatting.t('new_network'), nick, {});
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
            let con = this.server;

            this.$state.addNetwork(TextFormatting.t('new_network'), nick, {});

            IPC.send({
                nick: nick,
                server: con.server,
                port: con.port,
                tls: con.tls,
                password: con.password || '',
                type: 'addNetwork',
            });

            window.location.hash = '';

            this.addedNetworkToExisting = true;
        },
        addNetwork(temporary = false) {
            if (!this.server) {
                return;
            }

            let con = this.server;

            if (temporary) {
                this.$state.persistence.storageKey = null;
                this.$state.persistence.forgetState();

                this.init();
            }

            let network = this.$state.getNetworkFromAddress(con.server);
            if (!network) {
                network = this.$state.addNetwork(con.server, con.nick || ('Guest' + Math.floor(Math.random() * 100)), {
                    server: con.server,
                    port: con.port,
                    tls: con.tls,
                    password: con.password || '',
                });
            }

            window.location.hash = '';
            network.showServerBuffer('settings');

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
            this.$state.$emit('statebrowser.show');
        },
        async init() {
            if (!firstRun) {
                return;
            }

            firstRun = false;

            // persist the buffers in the state by default
            let persistSetting = this.$state.settings.startupOptions.remember_buffers;
            if (typeof persistSetting === 'undefined') {
                this.$state.persistence.includeBuffers = true;
            } else {
                this.$state.persistence.includeBuffers = !!persistSetting;
            }

            this.$state.persistence.watchStateForChanges();

            if (this.$state.settings.startupOptions.bouncer) {
                let controllerNet = this.$state.networks.find((n) => n.is_bnc);
                if (controllerNet) {
                    let bouncer = new BouncerProvider(this.$state);
                    bouncer.enable(
                        controllerNet.connection.server,
                        controllerNet.connection.port,
                        controllerNet.connection.tls,
                        controllerNet.connection.direct,
                        controllerNet.connection.path,
                    );
                }
            }
            // force restricted: false as users need access
            // to network settings to add a network
            this.$state.setSetting('settings.restricted', false);

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
