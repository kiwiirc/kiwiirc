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

        // If enabled, new IRC connections will be re-routed through the bouncer
        this.rewriteConnections = true;

        // A snapshot of the current networks. Compared against to detect changed networks
        this.networksSnapshot = Object.create(null);

        // If we are currently monitoring for network settings changes
        this.monitoringChanges = false;

        state.$on('irc.motd', this.onNetworkMotd.bind(this));
        state.$on('irc.bouncer state', this.onNetworkState.bind(this));
        state.$on('irc.bouncer networks', this.onBouncerNetworks.bind(this));
    }

    enable(server, port, tls, direct, path) {
        log(`Using a Bouncer Provider with server ${server}:${port}`);

        this.bnc.server = server;
        this.bnc.port = port || 6667;
        this.bnc.tls = !!tls;
        this.bnc.direct = !!direct;
        this.bnc.path = path || '';
        this.bnc.enabled = true;

        // get the bnc controller network
        const bncNetwork = this.state.networks.find((network) => network.is_bnc);

        // the bnc controller network password is saved in the format <username>:<password>.
        // if there is a bnc controller network with a password, use these credentials
        // for the bnc connection.
        if (bncNetwork?.connection?.password) {
            let [username, password] = this.parseBncCredentials(bncNetwork.connection.password);
            this.bnc.username = username;
            this.bnc.password = password;
        }

        // Enable BOUNCER on existing connections
        this.state.networks.forEach((network) => {
            network.ircClient.use(bouncerMiddleware());
        });

        // this.monitorNetworkChanges();
        this.listenToState();
    }

    // Try to get a connected network that can be used to control the bouncer
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
            log.debug(`BOUNCER cap not available on network ${network.name}, not using for BNC`);
            return;
        }

        // Set the bncnetid if the network upstream exists and we havn't already set it
        if (client.bnc.hasNetwork() && !network.connection.bncnetid) {
            network.connection.bncnetid = client.bnc.tags().netid;
        }

        // Use this initial network password for other network connections
        if (!this.bnc.username) {
            let [username, password] = this.parseBncCredentials(network.connection.password);
            this.bnc.username = username;
            this.bnc.password = password;
        }

        // If this is a BNC network, sync it before anything else so that we get all its info
        // and buffer states as soon as possible
        if (client.bnc.hasNetwork()) {
            await this.syncBncNetwork(network);
        }

        // If this is the controller network, add all other networks from the bouncer
        if (!network.connection.bncnetid) {
            await this.initAndAddNetworks(network);
        }
    }

    onNetworkState(event, network) {
        let isController = this.getController() === network;
        // We get connection state changes advertised on all bouncer connections, so only handle
        // the ones that come from the controller network since we only need to deal with it once.
        if (isController && event.state === 'disconnected') {
            // Mimick any network disconnections by closing this connection too
            let effectedNetwork = this.state.getNetworkFromBncNetId(event.networkId);
            if (effectedNetwork) {
                effectedNetwork.ircClient.connection.transport.close();
            }
        }
    }

    async initAndAddNetworks(network) {
        let client = network.ircClient;

        this.bnc.registered = true;

        // hide the empty (non-network) controller network
        if (!network.ircClient.bnc.hasNetwork()) {
            network.hidden = true;
            network.is_bnc = true;
        } else {
            network.hidden = false;
            network.is_bnc = false;
        }

        // onBouncerNetworks will pick up the event handler for this
        client.bnc.getNetworks();
    }

    onBouncerNetworks(bncNetworks) {
        log.debug(`Got ${bncNetworks.length} networks from the BNC`, bncNetworks);
        bncNetworks.forEach((bncNet) => this.addNetworkToState(bncNet));

        // Remove any networks we have locally but no longer exist on the BNC
        this.state.networks.forEach((existingNet) => {
            let isNetworkInBncList = !!bncNetworks.find((n) => (
                n.networkId === existingNet.connection.bncnetid
            ));

            if (!existingNet.is_bnc && !isNetworkInBncList) {
                log.debug(`Network '${existingNet.name}' (${existingNet.id}) was not in the BNC, removing locally`);
                this.state.removeNetwork(existingNet.id);
            }
        });

        // start monitoring network changes
        this.monitorNetworkChanges();
    }

    async syncBncNetwork(bncNetwork) {
        let client = bncNetwork.ircClient;

        log.debug(`Syncing network ${bncNetwork.name} from the BNC`);

        let buffers = await client.bnc.getBuffers(bncNetwork.connection.bncnetid);
        buffers.forEach((buffer) => {
            // The list of buffers also include the network name. Make use of it and make sure our
            // network name is up to date while we can. It may have changed elsewhere
            if (bncNetwork.name !== buffer.network) {
                log(`Detected network name change while syncing buffers. ${bncNetwork.name} > ${buffer.network}`);
                bncNetwork.name = buffer.network;
            }

            let newBuffer = this.state.addBuffer(bncNetwork.id, buffer.name);
            if (!newBuffer) {
                // The BNC might be giving up bad buffer names or something, so just make sure
                // that it's handled if it ever coccurs
                log.error(`Couldn't add BNC buffer, '${buffer.name}'`, buffer);
                return;
            }

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
            if (buffer.notify) {
                newBuffer.setting('alert_on', buffer.notify);
            }

            newBuffer.topic = buffer.topic || '';

            if (bncNetwork.state === 'connected' && newBuffer.isChannel() && newBuffer.joined) {
                client.raw('NAMES ' + newBuffer.name);
                client.who(newBuffer.name);
            }
        });

        // Remove any existing buffers that we no longer have on the bouncer
        bncNetwork.buffers.forEach((clientBuffer) => {
            if (!clientBuffer.isChannel() && !clientBuffer.isQuery()) {
                return;
            }

            let existingBuffers = buffers.filter((bncBuffer) => (
                bncBuffer.name.toLowerCase() === clientBuffer.name.toLowerCase()
            ));

            if (existingBuffers.length === 0) {
                this.state.removeBuffer(clientBuffer);
            }
        });
    }

    async addNetworkToState(network) {
        // Expects network to be in the format of:
        //  {
        //  "networkId":"xyz",
        //  "name":"freenode",
        //  "channel":"1",
        //  "connected":"1",
        //  "host":"irc.freenode.net",
        //  "port":"6667",
        //  "tls":"0",
        //  "nick":"notprawn99829"
        //  },
        let net = this.state.getNetworkFromBncNetId(network.networkId);
        if (!net) {
            net = this.state.addNetwork(network.name, network.nick || '', {
                server: network.host,
                port: network.port,
                tls: network.tls,
                password: network.password || '',
                bncnetid: network.networkId,
                username: network.user,
                account_password: network.account_password,
            });
        } else {
            // Make sure our existing network is all up to date
            net.name = network.name;
            net.connection.server = network.host;
            net.connection.port = parseInt(network.port, 10);
            net.connection.tls = network.tls;
            net.connection.nick = network.account || network.nick;
            net.connection.password = network.password || '';
            net.nick = network.currentNick || network.nick || '';
            net.password = network.account_password;
        }

        net.editable_name = true;
        return net;
    }

    // Keep a snapshot of what the current networks are. They will be periodically
    // compared with the active networks to see if anything has changed before
    // saving those changes.
    snapshotCurrentNetworks() {
        this.networksSnapshot = Object.create(null);

        this.state.networks.forEach((network) => {
            if (!network.connection.bncnetid) {
                return;
            }

            this.networksSnapshot[network.connection.bncnetid] = {
                bncnetid: network.connection.bncnetid,
                network: network.name,
                host: network.connection.server,
                port: network.connection.port,
                tls: network.connection.tls,
                account: network.connection.nick,
                account_password: network.password,
                server_password: network.connection.password,
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
            log.debug('No controller available to save networks');
            return;
        }

        this.state.networks.forEach((network) => {
            // don't save an empty controller to the network.
            // we can't use hasNetwork alone because that requires ircClient to be
            //  connected, and we save new nets before they are connected
            if (this.getController() === network && !network.ircClient.bnc.hasNetwork()) {
                return;
            }

            // Don't save any hidden networks. This includes the BNC controller network
            if (network.hidden) {
                return;
            }

            // Every network needs a valid name
            if (!network.name.match(/^[a-zA-Z_0-9.]+$/)) {
                log.debug(`Network ${network.id} has an invalid name. Not saving to the BNC`);
                return;
            }

            let bncnetid = network.connection.bncnetid;
            let snapshot = this.networksSnapshot[bncnetid] || {};
            let tags = {};

            if (network.name !== snapshot.network) {
                tags.network = network.name;
            }
            if (network.connection.server !== snapshot.host) {
                tags.host = network.connection.server;
            }
            if (network.connection.port !== snapshot.port) {
                tags.port = network.connection.port;
            }
            if (network.connection.tls !== snapshot.tls) {
                tags.tls = network.connection.tls;
            }
            if (network.password !== snapshot.account_password) {
                tags.account_password = network.password;
            }
            if (network.connection.nick !== snapshot.account) {
                tags.account = network.connection.nick;
            }
            if (network.connection.password !== snapshot.server_password) {
                tags.password = network.connection.password;
            }
            if (network.connection.nick !== snapshot.nick) {
                tags.nick = network.connection.nick;
            }
            if (network.username !== snapshot.username) {
                tags.user = network.username;
            }

            // A newly added network would not have a snapshot name (bncnetid) property set yet.
            // Only save the network if we've entered connection info.
            if (!snapshot.bncnetid && tags.host && tags.port && tags.nick) {
                log(`Saving new network ${network.name} to the BNC`);
                // ?? network.connection.bncname = network.name;
                controller.ircClient.bnc.addNetwork(
                    network.name,
                    tags.host,
                    tags.port,
                    tags.tls,
                    tags.nick,
                    tags.user,
                    tags.password,
                ).then((networkInfo) => {
                    network.connection.bncnetid = networkInfo.networkId;
                    network.name = networkInfo.network;
                });
            } else if (snapshot.bncnetid && Object.keys(tags).length > 0) {
                log(`Updating network ${network.name} on the BNC`);
                controller.ircClient.bnc.saveNetwork(bncnetid, tags);
            }
        });

        this.snapshotCurrentNetworks();
    }

    monitorNetworkChanges() {
        if (this.monitoringChanges) {
            return;
        }
        this.monitoringChanges = true;

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
            if (this.bnc.enabled && this.rewriteConnections) {
                let netname = network.name;

                let ircClient = network.ircClient;
                ircClient.options.host = this.bnc.server;
                ircClient.options.port = this.bnc.port;
                ircClient.options.tls = this.bnc.tls;

                // Only re-write the server password for non-bnc controller networks
                if (this.bnc.password && !event.network.is_bnc) {
                    let password = `${this.bnc.username}/${netname}:${this.bnc.password}`;
                    ircClient.options.password = password;
                }

                // The SASL auth already happens on the BNC, we only use it for UI purposes in kiwi
                ircClient.options.account = {};

                network.connection.direct = this.bnc.direct;
                ircClient.options.path = this.bnc.path;
            }
        });
        state.$on('network.connecting', (event) => {
            let controller = this.getController();
            if (!controller) {
                log.debug('No controller available to save network states');
                return;
            }

            this.saveState();

            let network = event.network;

            if (network.connection.bncnetid) {
                controller.ircClient.raw('BOUNCER connect ' + network.connection.bncnetid);
            }
        });
        state.$on('irc.motd', (event, network) => {
            network.buffers.forEach((buffer) => {
                if (buffer.isChannel() && buffer.enabled && buffer.joined) {
                    network.ircClient.who(buffer.name);
                }
            });
        });

        state.$on('network.new', (event) => {
            let network = event.network;

            // Enable BOUNCER on this connection
            network.ircClient.use(bouncerMiddleware());

            network.editable_name = true;

            // If network is attached to a bouncer do nothing
            // (use the name provided by the bouncer)
            if (network.connection.bncnetid) {
                return;
            }

            let existingNet = true;

            // append a number to the network name. E.g. "Network, Network2,..."
            // while there is a network with that name
            let currentNum = 1;
            let tryNetworkName;
            while (existingNet) {
                if (network.name && currentNum === 1) {
                    // don't append the number 1 if there is a custom name
                    tryNetworkName = network.name;
                } else {
                    tryNetworkName = (network.name || 'Network') + currentNum;
                }

                existingNet = _.find(state.networks, {
                    name: tryNetworkName,
                });

                if (!existingNet || existingNet === network) {
                    network.name = tryNetworkName;
                    break;
                }

                currentNum++;
            }
        });

        state.$on('network.removed', (event) => {
            let controller = this.getController();
            if (!controller) {
                log.debug('No controller available to save network states');
                return;
            }

            if (event.network.connection.bncnetid) {
                controller.ircClient.bnc.removeNetwork(event.network.connection.bncnetid);
            }
        });

        state.$on('buffer.close', (event) => {
            let buffer = event.buffer;
            let network = event.buffer.getNetwork();
            let bncnetid = network.connection.bncnetid;

            let controller = this.getController();
            if (!controller) {
                log.debug('No controller available to save buffer states');
                return;
            }

            if (bncnetid) {
                controller.ircClient.bnc.closeBuffer(bncnetid, buffer.name);
            }
        });
    }

    parseBncCredentials(bncNetworkPassword) {
        let [username, password] = bncNetworkPassword.split(':');
        username = username.split('/')[0];

        return [username, password];
    }
}
