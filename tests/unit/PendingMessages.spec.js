import state from '@/libs/state';
import PendingMessages from '@/libs/PendingMessages';

function setup(caps = ['echo-message', 'labeled-response']) {
    let s = state.create();
    let network = s.addNetwork('TestNet', 'tester', {});
    network.nick = 'tester';
    let buffer = s.addBuffer(network.id, '#test');

    let mockClient = {
        user: { nick: 'tester' },
        options: { message_max_length: 350 },
        network: {
            cap: { isEnabled: (c) => caps.includes(c) },
            options: {},
        },
        caseCompare: (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase(),
        say: jest.fn(),
        notice: jest.fn(),
        action: jest.fn(),
        tagmsg: jest.fn(),
    };
    network.frameworkClient = mockClient;

    let pending = new PendingMessages(network);
    Object.defineProperty(network, 'pendingMessages', { writable: true, value: pending });

    return { s, network, buffer, pending, client: mockClient };
}

// Build the echo event the IRC client would receive back from the server
function echoEvent(text, tags = {}, over = {}) {
    return {
        nick: 'tester',
        message: text,
        type: 'privmsg',
        time: Date.now(),
        tags: { msgid: 'srv-' + Math.random().toString(36).substr(2), ...tags },
        ...over,
    };
}

describe('PendingMessages sending', () => {
    it('renders the message optimistically as pending and sends it with a label', () => {
        let { buffer, pending, client } = setup();

        let message = pending.sendAndTrack(buffer, 'hello world');

        expect(message.pending).toBe(true);
        expect(buffer.getMessages()).toHaveLength(1);
        expect(client.say).toHaveBeenCalledTimes(1);

        let [target, text, tags] = client.say.mock.calls[0];
        expect(target).toBe('#test');
        expect(text).toBe('hello world');
        expect(tags.label).toBeTruthy();
    });

    it('sends without a label but still tracks when only echo-message is enabled', () => {
        let { buffer, pending, client } = setup(['echo-message']);

        let message = pending.sendAndTrack(buffer, 'hello');

        expect(message.pending).toBe(true);
        let [, , tags] = client.say.mock.calls[0];
        expect(tags.label).toBeUndefined();
        expect(pending.entries).toHaveLength(1);
    });

    it('keeps the current behaviour when no echo caps are enabled', () => {
        let { buffer, pending, client } = setup([]);

        let message = pending.sendAndTrack(buffer, 'hello');

        expect(message.pending).toBe(false);
        expect(pending.entries).toHaveLength(0);
        expect(client.say).toHaveBeenCalledWith('#test', 'hello', {});
    });

    it('sends labeled actions as a raw CTCP via say()', () => {
        let { buffer, pending, client } = setup();

        pending.sendAndTrack(buffer, 'waves', { type: 'action' });

        expect(client.action).not.toHaveBeenCalled();
        let [, text, tags] = client.say.mock.calls[0];
        expect(text).toBe('\x01ACTION waves\x01');
        expect(tags.label).toBeTruthy();
    });

    it('uses client.action() for unlabeled actions', () => {
        let { buffer, pending, client } = setup([]);

        pending.sendAndTrack(buffer, 'waves', { type: 'action' });

        expect(client.action).toHaveBeenCalledWith('#test', 'waves');
    });
});

describe('PendingMessages message splitting', () => {
    // A word-based long line the wire budget must break into several PRIVMSGs
    const longText = Array.from({ length: 60 }, (_, i) => 'word' + i).join(' ');

    it('splits a long message into one tracked optimistic message per wire block', () => {
        let { buffer, pending, client } = setup();
        client.options.message_max_length = 100;

        pending.sendAndTrack(buffer, longText);

        let sentBlocks = client.say.mock.calls.map((c) => c[1]);
        expect(sentBlocks.length).toBeGreaterThan(1);
        // Every optimistic message and every wire send line up 1:1
        expect(buffer.getMessages()).toHaveLength(sentBlocks.length);
        expect(pending.entries).toHaveLength(sentBlocks.length);
        // Each wire block carries its own unique label
        let labels = client.say.mock.calls.map((c) => c[2].label);
        expect(new Set(labels).size).toBe(labels.length);
        // Rejoining the blocks reproduces the original text
        expect(sentBlocks.join(' ')).toBe(longText);
    });

    it('reconciles each fragment echo, leaving no duplicates or failures', () => {
        let { buffer, pending, client } = setup();
        client.options.message_max_length = 100;

        pending.sendAndTrack(buffer, longText);
        let blocks = client.say.mock.calls.map((c) => c[1]);

        // The server echoes each wire block back as its own message
        blocks.forEach((block) => {
            let event = echoEvent(block);
            expect(pending.reconcile(event, '#test')).toBe(true);
        });

        expect(buffer.getMessages()).toHaveLength(blocks.length);
        expect(buffer.getMessages().every((m) => !m.pending && !m.send_failed)).toBe(true);
    });

    it('does not split short messages (fast path)', () => {
        let { buffer, pending, client } = setup();

        pending.sendAndTrack(buffer, 'short one');

        expect(client.say).toHaveBeenCalledTimes(1);
        expect(buffer.getMessages()).toHaveLength(1);
    });
});

describe('PendingMessages reconciliation', () => {
    it('reconciles the labeled echo onto the optimistic message', () => {
        let { buffer, pending, client } = setup();

        let message = pending.sendAndTrack(buffer, 'hello');
        let label = client.say.mock.calls[0][2].label;

        let event = echoEvent('hello', { label });
        expect(pending.reconcile(event, '#test')).toBe(true);

        expect(buffer.getMessages()).toHaveLength(1);
        expect(message.id).toBe(event.tags.msgid);
        expect(message.pending).toBe(false);
        expect(message.tags.msgid).toBe(event.tags.msgid);
        expect(message.tags.label).toBeUndefined();
        expect(buffer.messagesObj.messageIds[event.tags.msgid]).toBe(message);
    });

    it('dedups the history replay via messageIds after the msgid was grafted', () => {
        let { s, buffer, pending, client } = setup();

        pending.sendAndTrack(buffer, 'hello');
        let label = client.say.mock.calls[0][2].label;
        let event = echoEvent('hello', { label });
        pending.reconcile(event, '#test');

        // Simulate the CHATHISTORY replay of the same message after a reconnect
        s.addMessage(buffer, {
            time: Date.now(),
            nick: 'tester',
            message: 'hello',
            type: 'privmsg',
            tags: { msgid: event.tags.msgid },
        });

        expect(buffer.getMessages()).toHaveLength(1);
    });

    it('matches heuristically when the echo has no label', () => {
        let { buffer, pending } = setup(['echo-message']);

        let message = pending.sendAndTrack(buffer, 'hello');
        let event = echoEvent('hello');

        expect(pending.reconcile(event, '#test')).toBe(true);
        expect(message.id).toBe(event.tags.msgid);
        expect(buffer.getMessages()).toHaveLength(1);
    });

    it('never over-deduplicates repeated identical messages', () => {
        let { buffer, pending } = setup(['echo-message']);

        let first = pending.sendAndTrack(buffer, 'hi');
        let second = pending.sendAndTrack(buffer, 'hi');

        let echo1 = echoEvent('hi');
        let echo2 = echoEvent('hi');

        expect(pending.reconcile(echo1, '#test')).toBe(true);
        expect(pending.reconcile(echo2, '#test')).toBe(true);

        // Both optimistic messages remain, each with its own server msgid
        expect(buffer.getMessages()).toHaveLength(2);
        expect(first.id).toBe(echo1.tags.msgid);
        expect(second.id).toBe(echo2.tags.msgid);

        // A third identical echo (eg. from another client) must not match anything
        expect(pending.reconcile(echoEvent('hi'), '#test')).toBe(false);
    });

    it('does not heuristically match messages from other people', () => {
        let { buffer, pending } = setup(['echo-message']);

        pending.sendAndTrack(buffer, 'hello');
        let event = echoEvent('hello', {}, { nick: 'someoneelse' });

        expect(pending.reconcile(event, '#test')).toBe(false);
    });

    it('reconciles our own echo even when it resolves to a different buffer name', () => {
        // InspIRCd echoes can resolve to a different buffer than where we rendered the
        // optimistic copy; nick + content are authoritative, so buffer is not required
        let { buffer, pending } = setup(['echo-message']);

        let message = pending.sendAndTrack(buffer, 'hello');
        let event = echoEvent('hello');

        expect(pending.reconcile(event, '#other')).toBe(true);
        expect(message.id).toBe(event.tags.msgid);
    });

    it('prefers the same-buffer entry for identical content sent to two channels', () => {
        let { s, network, buffer, pending } = setup(['echo-message']);
        let other = s.addBuffer(network.id, '#other');

        let msgTest = pending.sendAndTrack(buffer, 'gm');
        let msgOther = pending.sendAndTrack(other, 'gm');

        // Echo for #other must graft onto the #other copy, not the earlier #test one
        let echoOther = echoEvent('gm');
        expect(pending.reconcile(echoOther, '#other')).toBe(true);
        expect(msgOther.id).toBe(echoOther.tags.msgid);
        expect(msgTest.pending).toBe(true);

        let echoTest = echoEvent('gm');
        expect(pending.reconcile(echoTest, '#test')).toBe(true);
        expect(msgTest.id).toBe(echoTest.tags.msgid);
    });

    it('reconciles reordered multi-line echoes independently by content', () => {
        let { buffer, pending } = setup(['echo-message']);

        let m1 = pending.sendAndTrack(buffer, 'line one');
        let m2 = pending.sendAndTrack(buffer, 'line two');

        // Server echoes them back in the opposite order
        let e2 = echoEvent('line two');
        let e1 = echoEvent('line one');
        expect(pending.reconcile(e2, '#test')).toBe(true);
        expect(pending.reconcile(e1, '#test')).toBe(true);

        expect(m2.id).toBe(e2.tags.msgid);
        expect(m1.id).toBe(e1.tags.msgid);
    });
});

describe('PendingMessages failure & resend', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    it('flags a message as failed when no echo arrives in time', () => {
        let { buffer, pending } = setup();

        let message = pending.sendAndTrack(buffer, 'hello');
        expect(message.pending).toBe(true);

        jest.advanceTimersByTime(31000);

        expect(message.pending).toBe(false);
        expect(message.send_failed).toBe(true);
        expect(pending.canResend(message)).toBe(true);
    });

    it('flags all in-flight messages as failed on disconnect', () => {
        let { buffer, pending } = setup();

        let m1 = pending.sendAndTrack(buffer, 'one');
        let m2 = pending.sendAndTrack(buffer, 'two');

        pending.failAll();

        expect(m1.send_failed).toBe(true);
        expect(m2.send_failed).toBe(true);
    });

    it('resends a failed message reusing the same message object', () => {
        let { buffer, pending, client } = setup();

        let message = pending.sendAndTrack(buffer, 'hello');
        pending.failAll();
        expect(message.send_failed).toBe(true);

        expect(pending.resend(message)).toBe(true);

        expect(message.pending).toBe(true);
        expect(message.send_failed).toBe(false);
        expect(client.say).toHaveBeenCalledTimes(2);
        // No new message bubble was created
        expect(buffer.getMessages()).toHaveLength(1);

        // The new echo reconciles onto the same message
        let label = client.say.mock.calls[1][2].label;
        let event = echoEvent('hello', { label });
        expect(pending.reconcile(event, '#test')).toBe(true);
        expect(message.id).toBe(event.tags.msgid);
    });

    it('un-fails a failed message when the history replay proves it was delivered', () => {
        let { buffer, pending } = setup(['echo-message']);

        let message = pending.sendAndTrack(buffer, 'hello');
        pending.failAll();
        expect(message.send_failed).toBe(true);

        // Reconnect: CHATHISTORY replays the message - it did reach the server
        let event = echoEvent('hello');
        expect(pending.reconcile(event, '#test')).toBe(true);

        expect(message.send_failed).toBe(false);
        expect(message.id).toBe(event.tags.msgid);
        expect(buffer.getMessages()).toHaveLength(1);
    });

    it('resends to the original wire target when it differs from the buffer name', () => {
        let { buffer, pending, client } = setup();

        // Statusmsg-style send: displayed in #test but sent to @#test
        let message = pending.sendAndTrack(buffer, 'ops only', { targetName: '@#test' });
        expect(client.say.mock.calls[0][0]).toBe('@#test');

        pending.failAll();
        expect(pending.resend(message)).toBe(true);

        expect(client.say).toHaveBeenCalledTimes(2);
        expect(client.say.mock.calls[1][0]).toBe('@#test');
    });

    it('refuses to resend a message that is not in a failed state', () => {
        let { buffer, pending } = setup();

        let message = pending.sendAndTrack(buffer, 'hello');

        expect(pending.resend(message)).toBe(false);
        expect(pending.canResend(message)).toBe(false);
    });
});

describe('PendingMessages labeled ACK', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.useRealTimers();
    });

    it('clears the pending state and prevents a timeout failure', () => {
        let { buffer, pending, client } = setup();

        let message = pending.sendAndTrack(buffer, 'hello');
        let label = client.say.mock.calls[0][2].label;

        expect(pending.handleAck(label)).toBe(true);
        expect(message.pending).toBe(false);
        expect(message.send_failed).toBe(false);

        jest.advanceTimersByTime(31000);
        expect(message.send_failed).toBe(false);
    });

    it('keeps an acked entry graftable by a later unlabeled echo', () => {
        let { buffer, pending, client } = setup();

        let message = pending.sendAndTrack(buffer, 'hello');
        let label = client.say.mock.calls[0][2].label;
        pending.handleAck(label);

        // The upstream echo arrives later without our label (heuristic regime)
        let event = echoEvent('hello');
        expect(pending.reconcile(event, '#test')).toBe(true);
        expect(message.id).toBe(event.tags.msgid);
        expect(buffer.getMessages()).toHaveLength(1);
    });

    it('does not flag acked entries as failed on disconnect', () => {
        let { buffer, pending, client } = setup();

        let message = pending.sendAndTrack(buffer, 'hello');
        pending.handleAck(client.say.mock.calls[0][2].label);

        pending.failAll();
        expect(message.send_failed).toBe(false);
    });

    it('ignores unknown or missing labels', () => {
        let { pending } = setup();

        expect(pending.handleAck('nope')).toBe(false);
        expect(pending.handleAck(undefined)).toBe(false);
    });

    it('expires acked entries after their echo window, keeping failed ones', () => {
        let { buffer, pending, client } = setup();

        pending.sendAndTrack(buffer, 'acked msg');
        pending.handleAck(client.say.mock.calls[0][2].label);
        pending.sendAndTrack(buffer, 'failed msg');
        pending.failAll();

        // A minute later a new send triggers the lazy sweep
        jest.advanceTimersByTime(61000);
        pending.sendAndTrack(buffer, 'later msg');

        let states = pending.entries.map((e) => e.state);
        expect(states).toEqual(['failed', 'pending']);
    });
});

describe('PendingMessages special buffers', () => {
    it('does not track or label messages to special buffers', () => {
        let { s, network, pending, client } = setup();
        let bncBuffer = s.addBuffer(network.id, '*bnc');

        let message = pending.sendAndTrack(bncBuffer, 'help');

        expect(message.pending).toBe(false);
        expect(pending.entries).toHaveLength(0);
        let [target, text, tags] = client.say.mock.calls[0];
        expect(target).toBe('*bnc');
        expect(text).toBe('help');
        expect(tags.label).toBeUndefined();
    });
});
