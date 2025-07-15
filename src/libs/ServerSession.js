'kiwi public';

import EventEmitter from 'eventemitter3';
import getState from './state';
import * as ServerConnection from './ServerConnection';

export default class ServerSession {
    constructor(sessionId) {
        let channelConstruct = ServerConnection.createChannelConstructor(
            getState().settings.kiwiServer,
            sessionId || '',
            '0'
        );

        this.bus = new EventEmitter();
        this.channel = channelConstruct();
        this.channel.on('line', (line) => {
            if (line.indexOf('CONTROL ') === 0) {
                let parts = line.split(' ');

                // Remove the 'CONTROL' first part
                parts.shift();

                let command = parts.shift();
                this.bus.emit(command, parts);
            }
        });
    }

    auth(userId, password) {
        return new Promise((resolve, reject) => {
            this.bus.once('AUTH', (params) => {
                let result = params[0];

                if (result === 'OK') {
                    resolve(true);
                } else {
                    reject(result);
                }
            });

            this.channel.sendControl(`CONTROL AUTH ${userId} ${password}`);
        });
    }

    getNetworks() {
        return new Promise((resolve) => {
            let networks = Object.create(null);

            let onListing = (params) => {
                if (params[1] === 'END') {
                    this.bus.off('LISTING', onListing);

                    // Convert our networks object to an array first
                    let networkArr = [];
                    Object.keys(networks).forEach((channeId) => {
                        networkArr.push(networks[channeId]);
                    });

                    resolve(networkArr);
                    return;
                }

                if (params[0] === 'NETWORK') {
                    let props = params.slice(1);
                    let network = { buffers: [] };

                    props.forEach((prop) => {
                        let parts = prop.split('=');
                        if (parts[0] && parts[1]) {
                            network[parts[0].toLowerCase()] = parts[1];
                        }
                    });

                    if (network.channel) {
                        networks[network.channel] = network;
                    }
                }

                if (params[0] === 'BUFFER') {
                    let props = params.slice(1);
                    let buffer = {};

                    props.forEach((prop) => {
                        let parts = prop.split('=');
                        if (parts[0] && parts[1]) {
                            buffer[parts[0].toLowerCase()] = parts[1];
                        }
                    });

                    let network = networks[buffer.channel];
                    if (network) {
                        network.buffers.push(buffer);
                    }
                }
            };

            this.bus.on('LISTING', onListing);
            this.channel.sendControl('CONTROL LIST NETWORKS');
        });
    }
}
