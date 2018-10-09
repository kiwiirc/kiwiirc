'kiwi public';

import _ from 'lodash';
import state from '@/libs/state';

export function orderBuffers(buffers) {
    // Since vuejs will sort in-place and update views when .sort is called
    // on an array, clone it first so that we have a plain array to sort
    let list = buffers.map(b => b);

    list = _.filter(list, buffer => !buffer.isServer());
    list = list.sort((a, b) => {
        let order = 0;
        if (a.isChannel() && b.isQuery()) {
            order = -1;
        } else if (a.isQuery() && b.isChannel()) {
            order = 1;
        } else {
            order = a.name.localeCompare(b.name);
        }

        return order;
    });

    return list;
}

export function getNextBuffer() {
    return getBufferFromDirection(1);
}

export function getPreviousBuffer() {
    return getBufferFromDirection(-1);
}

function getBufferFromDirection(direction) {
    let network = state.getActiveNetwork();
    let buffer = state.getActiveBuffer();

    if (!network || !buffer) {
        return null;
    }

    let ordered = orderBuffers(network.buffers);
    let index = _.findIndex(ordered, ['name', buffer.name]) + direction;

    if (index >= ordered.length || index < 0) {
        network = getNetworkFromDirection(direction);
        ordered = orderBuffers(network.buffers);
        buffer = (direction === 1) ? ordered[0] : ordered[ordered.length - 1];
    } else {
        buffer = ordered[index];
    }
    return buffer;
}

function getNetworkFromDirection(direction) {
    let network = state.getActiveNetwork();
    for (let i = 0; i < state.networks.length; i++) {
        let index = _.findIndex(state.networks, ['id', network.id]) + direction;

        if (index >= state.networks.length && state.networks.length >= 0) {
            network = state.networks[0];
        } else if (index < 0) {
            network = state.networks[state.networks.length - 1];
        } else {
            network = state.networks[index];
        }
        if (network.buffers.length > 1) {
            return network;
        }
    }
    return network;
}
