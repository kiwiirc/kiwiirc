'kiwi public';

import InputHandler from '@/libs/InputHandler';

function makeCapStub(enabledCaps) {
    return {
        isEnabled: (cap) => enabledCaps.includes(cap),
    };
}

function makeNetwork(capStub, ircClientSay) {
    return {
        id: 1,
        nick: 'testnick',
        isChannelName: (name) => name.startsWith('#'),
        connection: { server: 'irc.example.com' },
        ircClient: {
            network: {
                cap: capStub,
                extractTargetGroup: () => null,
            },
            say: ircClientSay || jest.fn(),
            notice: jest.fn(),
            action: jest.fn(),
        },
        setting: () => undefined,
    };
}

function makeBuffer(name) {
    return {
        name,
        isServer: () => false,
        isChannel: () => name.startsWith('#'),
    };
}

function makeState(addMessageSpy) {
    const listeners = {};
    const watchers = [];

    return {
        addMessage: addMessageSpy,
        getOrAddBufferByName: (networkId, name) => makeBuffer(name),
        getBufferByName: () => null,
        getActiveNetwork: () => null,
        getActiveBuffer: () => null,
        setting: (key) => {
            if (key === 'aliases') return '';
            return undefined;
        },
        $on: (event, fn) => {
            listeners[event] = fn;
        },
        $emit: (event, ...args) => {
            if (listeners[event]) listeners[event](...args);
        },
        $watch: () => {},
    };
}

describe('echo-message deduplication in InputHandler', () => {
    it('adds the message locally when echo-message cap is not active', () => {
        const addMessage = jest.fn();
        const state = makeState(addMessage);
        const cap = makeCapStub([]);
        const network = makeNetwork(cap);
        const buffer = makeBuffer('#channel');

        const handler = new InputHandler(state);

        handler.processLine('/msg #channel hello', { network, buffer });

        expect(addMessage).toHaveBeenCalledTimes(1);
    });

    it('does not add the message locally when echo-message cap is active', () => {
        const addMessage = jest.fn();
        const state = makeState(addMessage);
        const cap = makeCapStub(['echo-message']);
        const network = makeNetwork(cap);
        const buffer = makeBuffer('#channel');

        const handler = new InputHandler(state);

        handler.processLine('/msg #channel hello', { network, buffer });

        expect(addMessage).not.toHaveBeenCalled();
    });

    it('adds notices locally when echo-message cap is not active', () => {
        const addMessage = jest.fn();
        const state = makeState(addMessage);
        const cap = makeCapStub([]);
        const network = makeNetwork(cap);
        const buffer = makeBuffer('#channel');

        const handler = new InputHandler(state);

        handler.processLine('/notice #channel hello', { network, buffer });

        expect(addMessage).toHaveBeenCalledTimes(1);
    });

    it('does not add notices locally when echo-message cap is active', () => {
        const addMessage = jest.fn();
        const state = makeState(addMessage);
        const cap = makeCapStub(['echo-message']);
        const network = makeNetwork(cap);
        const buffer = makeBuffer('#channel');

        const handler = new InputHandler(state);

        handler.processLine('/notice #channel hello', { network, buffer });

        expect(addMessage).not.toHaveBeenCalled();
    });
});
