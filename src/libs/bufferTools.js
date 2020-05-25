'kiwi public';

import _ from 'lodash';
import getState from '@/libs/state';

export function orderBuffers(buffers) {
    // Since vuejs will sort in-place and update views when .sort is called
    // on an array, clone it first so that we have a plain array to sort
    let list = buffers.map((b) => b);

    list = _.filter(list, (buffer) => !buffer.isServer());
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

export function orderedMessages(buffer) {
    let network = buffer.getNetwork();
    let currentNick = network.nick;
    let bufferMessages = buffer.getMessages();

    // Hack; We need to make vue aware that we depend on buffer.message_count in order to
    // get the messagelist to update its DOM, as the change of message_count alerts
    // us that the messages have changed. This is done so that vue does not have to make
    // every emssage reactive which gets very expensive.
    /* eslint-disable no-unused-vars */
    let ignoredVar = buffer.message_count;

    let messages = bufferMessages.slice(0, bufferMessages.length);
    messages.sort((a, b) => {
        if (a.time > b.time) {
            return 1;
        } else if (b.time > a.time) {
            return -1;
        }

        return a.instance_num > b.instance_num ?
            1 :
            -1;
    });

    let list = [];
    let maxSize = buffer.setting('scrollback_size');
    let showJoinParts = buffer.setting('show_joinparts');
    let showTopics = buffer.setting('show_topics');
    let showNickChanges = buffer.setting('show_nick_changes');
    let showModeChanges = buffer.setting('show_mode_changes');
    for (let i = messages.length - 1; i >= 0 && list.length < maxSize; i--) {
        if (!showJoinParts && messages[i].type === 'traffic') {
            continue;
        }
        if (!showTopics && messages[i].type === 'topic') {
            continue;
        }
        if (!showNickChanges && messages[i].type === 'nick') {
            continue;
        }
        if (!showModeChanges && messages[i].type === 'mode') {
            continue;
        }
        // Ignored users have the ignore flag set
        if (messages[i].ignore) {
            continue;
        }

        // Don't show the first connection message. Channels are only interested in
        // the joining message at first. Dis/connection messages are only relevant here
        // if the dis/connection happens between messages (during a conversation)
        if (messages[i].type === 'connection' && i === 0) {
            continue;
        }

        // When we join a channel the topic is usually sent next. But this looks
        // ugly when rendered. So we switch the topic + join messages around so
        // that the topic is first in the message list.
        if (
            messages[i].type === 'topic' &&
            messages[i - 1] &&
            messages[i - 1].type === 'traffic' &&
            messages[i - 1].nick === currentNick
        ) {
            list.push(messages[i - 1]);
            list.push(messages[i]);
            i--;
        } else {
            list.push(messages[i]);
        }
    }

    return list.reverse();
}

export function getNextBuffer() {
    return getBufferFromDirection(1);
}

export function getPreviousBuffer() {
    return getBufferFromDirection(-1);
}

function getBufferFromDirection(direction) {
    let state = getState();
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
    let state = getState();
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
