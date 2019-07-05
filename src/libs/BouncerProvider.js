'kiwi public';

import _ from 'lodash';
import Logger from '@/libs/Logger';
import bouncerMiddleware from '@/libs/BouncerMiddleware';

let log = Logger.namespace('BouncerProvider.js');

export default class BouncerProvider {
    constructor(state) {
        this.state = state;

        // This is the network that will be used to control the bouncer
        this.controllerNetwork = null;

        // The detected credentials for the BNC
        this.bnc = {
            enabled: false,
            username: '',
            password: '',
            server: '',
            port: 6667,
            tls: false,
            direct: false,
            path: '',
            registered: false,
        };

        // A snapshot of the current networks. Compared against to detect changed networks
        this.networksSnapshot = Object.create(null);

        state.$on('irc.motd', this.onNetworkMotd.bind(this));
    }

    enable(server, port, tls, direct, path) {
        this.bnc.server = server;
        this.bnc.port = port || 6667;
        this.bnc.tls = !!tls;
        this.bnc.direct = !!direct;
        this.bnc.path = path || '';
        this.bnc.enabled = true;

        // this.monitorNetworkChanges();
        this.listenToState();
    }

    // Try to get connected network that can be used to control the bouncer
    getController() {
        if (this.controllerNetwork && this.controllerNetwork.state === 'connected') {
            return this.controllerNetwork;
        }

        this.controllerNetwork = null;
        for (let i = 0; i < this.state.networks.length; i++) {
            let network = this.state.networks[i];
            let client = network.ircClient;
            if (network.state === 'connected' && client.network.cap.isEnabled('bouncer')) {
                this.controllerNetwork = network;
                break;
            }
        }

        return this.controllerNetwork;
    }

    async onNetworkMotd(event, network) {
        let client = network.ircClient;

        if (!this.bnc.enabled) {
            return;
        }

        if (!client.network.cap.isEnabled('bouncer')) {
            return;
        }

        // Set the bncname if the network upstream exists and we havn't already set it
        if (client.bnc.hasNetwork() && !network.connection.bncname) {
            network.connection.bncname = client.bnc.tags().network;
        }

        // First-run setup. Only run on the first connection of the first network connected
        if (this.getController() === network && !this.bnc.registered) {
            await this.initAndAddNetworks(network);
        }
    }

    async initAndAddNetworks(network) {
        let client = network.ircClient;

        this.bnc.registered = true;

        // hide the empty (non-network) controller network
        if (!network.ircClient.bnc.hasNetwork()) {
            network.hidden = true;
        } else {
            network.hidden = false;
        }

        // populate network list from the controller connection
        let bncNetworks = await client.bnc.getNetworks();
        let bncBuffers = [];

        try {
            bncBuffers = await Promise.all(bncNetworks.map(bncNet => (
                client.bnc.getBuffers(bncNet.name)
            )));
        } catch (err) {
            log.error(err);
        }

        let preparedNetworks = [];
        for (let i = 0; i < bncNetworks.length; i++) {
            let bncNet = bncNetworks[i];
            bncNet.buffers = bncBuffers[i];
            preparedNetworks.push(bncNet);
        }

        preparedNetworks.forEach(bncNet => this.addNetworkToState(bncNet));

        // Use this initial network password for other network connections
        let [username, password] = network.password.split(':');
        username = username.split('/')[0];
        this.bnc.username = username;
        this.bnc.password = password;
        this.bnc.server = network.connection.server;
        this.bnc.port = network.connection.port;
        this.bnc.tls = network.connection.tls;
        this.bnc.direct = network.connection.direct;
        this.bnc.path = network.connection.path || '';
        this.bnc.enabled = true;

        // start monitoring network changes
        this.monitorNetworkChanges();
    }

    addNetworkToState(network) {
        // Expects network to be in the format of:
        //  {
        //  "buffers":[{"channel":"1","name":"#prawnsalad","joined":"1"}],
        //  "name":"freenode",
        //  "channel":"1",
        //  "connected":"1",
        //  "host":"irc.freenode.net",
        //  "port":"6667",
        //  "tls":"0",
        //  "nick":"notprawn99829"
        //  },
        let net = this.state.getNetworkFromBncName(network.name);
        if (!net) {
            net = this.state.addNetwork(network.name, network.nick || '', {
                server: network.host,
                port: network.port,
                tls: network.tls,
                password: network.password,
                bncname: network.name,
                username: network.user,
            });
        }

        network.buffers.forEach((buffer) => {
            let newBuffer = this.state.addBuffer(net.id, buffer.name);
            if (buffer.joined) {
                newBuffer.enabled = true;
                newBuffer.joined = true;
            } else {
                newBuffer.enabled = false;
                newBuffer.joined = false;
            }
            if (buffer.seen) {
                newBuffer.last_read = (new Date(buffer.seen)).getTime();
            }

            if (net.state === 'connected' && newBuffer.isChannel() && newBuffer.joined) {
                net.ircClient.raw('NAMES ' + newBuffer.name);
                net.ircClient.raw('TOPIC ' + newBuffer.name);
            }
        });
    }

    // Keep a snapshot of what the current networks are. They will be periodically
    // compared with the active networks to see if anything has changed before
    // saving those changes.
    snapshotCurrentNetworks() {
        this.networksSnapshot = Object.create(null);

        this.state.networks.forEach((network) => {
            if (!network.connection.bncname) {
                return;
            }

            this.networksSnapshot[network.connection.bncname] = {
                name: network.connection.bncname,
                host: network.connection.server,
                port: network.connection.port,
                tls: network.connection.tls,
                password: network.password,
                nick: network.connection.nick,
                username: network.username,
            };
        });
    }

    // Compare the current networks with our previously saved snapshot of
    // networks. Save any changes to the bouncer
    saveState() {
        let controller = this.getController();
        if (!controller) {
            log('No controller available to save networks');
            return;
        }

        this.state.networks.forEach((network) => {
            // don't save an empty controller to the network.
            // we can't use hasNetwork alone because that requires ircClient to be
            //  connected, and we save new nets before they are connected
            if (this.getController() === network && !network.ircClient.bnc.hasNetwork()) {
                return;
            }

            let bncName = network.connection.bncname;
            let snapshot = this.networksSnapshot[bncName] || {};
            let tags = {};

            if (network.connection.server !== snapshot.host) {
                tags.host = network.connection.server;
            }
            if (network.connection.port !== snapshot.port) {
                tags.port = network.connection.port;
            }
            if (network.connection.tls !== snapshot.tls) {
                tags.tls = network.connection.tls;
            }
            if (network.password !== snapshot.password) {
                tags.password = network.password;
            }
            if (network.connection.nick !== snapshot.nick) {
                tags.nick = network.connection.nick;
            }
            if (network.username !== snapshot.username) {
                tags.user = network.username;
            }

            // A newly added network would not have a snapshot name (bncname) property set yet.
            // Only save the network if we've entered connection info.
            if (!snapshot.name && tags.host && tags.port && tags.nick) {
                network.connection.bncname = network.name;
                controller.ircClient.bnc.addNetwork(
                    network.name,
                    tags.host,
                    tags.port,
                    tags.tls,
                    tags.nick,
                    tags.user,
                    tags.password,
                );
            } else if (snapshot.name) {
                controller.ircClient.bnc.saveNetwork(bncName, tags);
            }
        });

        this.snapshotCurrentNetworks();
    }

    monitorNetworkChanges() {
        this.snapshotCurrentNetworks();

        let debouncedSaveState = _.debounce(this.saveState.bind(this), 2000);
        this.state.$watch('networks', debouncedSaveState, { deep: true });
    }

    listenToState() {
        let state = this.state;

        // Just before we connect to a network, make sure the BNC is saved and connected to
        // it or at least trying to connect.
        // Ie. Quickly creating a network and hitting connect before it's had time to
        //     save itself to the bouncer
        state.$on('network.connecting', (event) => {
            // Redirect the connection towards the bouncer with the network specific password
            let network = event.network;
            if (this.bnc.enabled) {
                let netname = network.connection.bncname;

                let ircClient = network.ircClient;
                ircClient.options.host = this.bnc.server;
                ircClient.options.port = this.bnc.port;
                ircClient.options.tls = this.bnc.tls;

                if (this.bnc.password) {
                    let password = `${this.bnc.username}/${netname}:${this.bnc.password}`;
                    ircClient.options.password = password;
                }

                network.connection.direct = this.bnc.direct;
                ircClient.options.path = this.bnc.path;
            }
        });
        state.$on('network.connecting', (event) => {
            let controller = this.getController();
            if (!controller) {
                log('No controller available to save network states');
                return;
            }

            this.saveState();

            let network = event.network;

            if (network.connection.bncname) {
                controller.ircClient.raw('BOUNCER connect ' + network.connection.bncname);
            }
        });
        state.$on('irc.motd', (event, network) => {
            network.buffers.forEach((buffer) => {
                if (buffer.isChannel() && buffer.enabled && buffer.joined) {
                    network.ircClient.who(buffer.name);
                }
            });
        });

        // Very hacky until we have network name renaming on the bnc. When a new network
        // is added, change the name to the next available network name.
        state.$on('network.new', (event) => {
            let network = event.network;

            // Enable BOUNCER on this connection
            network.ircClient.use(bouncerMiddleware());

            // Update the network name to NetworkN if hasn't got once from the bouncer yet
            if (!network.connection.bncname) {
                let currentNum = 1;
                let existingNet = true;
                while (existingNet) {
                    existingNet = _.find(state.networks, {
                        name: 'Network' + currentNum,
                    });
                    existingNet = existingNet || _.find(state.networks, {
                        connection: { bncname: 'Network' + currentNum },
                    });

                    if (!existingNet || network === existingNet) {
                        network.name = 'Network' + currentNum;
                        existingNet = null;
                    }

                    currentNum++;
                }
            }
        });

        state.$on('network.removed', (event) => {
            let controller = this.getController();
            if (!controller) {
                log('No controller available to save network states');
                return;
            }

            if (event.network.connection.bncname) {
                controller.ircClient.bnc.removeNetwork(event.network.connection.bncname);
            }
        });

        state.$on('buffer.close', (event) => {
            let buffer = event.buffer;
            let network = event.buffer.getNetwork();
            let bncName = network.connection.bncname;

            let controller = this.getController();
            if (!controller) {
                log('No controller available to save buffer states');
                return;
            }

            if (bncName) {
                controller.ircClient.bnc.closeBuffer(bncName, buffer.name);
            }
        });
    }
}
