'kiwi public';

import { lineBreak } from 'irc-framework/src/linebreak';
import * as TextFormatting from '@/helpers/TextFormatting';

// Fallback wire budget when the client hasn't set message_max_length
const DEFAULT_MAX_BYTES = 400;

// How long we wait for the server echo before flagging a message as not sent
const SEND_TIMEOUT_MS = 30000;

// Safety cap so unresolved entries can never grow unbounded
const MAX_ENTRIES = 200;

// How long an acked entry stays graftable. In the heuristic regime the unlabeled echo
// follows the ACK within seconds; after this window the entry is just leftover memory.
// Failed entries are deliberately never expired - the resend UI relies on them.
const ACKED_TTL_MS = 60000;

let nextLabelNum = 1;
// Unique-ish per app load so labels from a previous session can never collide
const labelPrefix = 'kw' + Date.now().toString(36) + '-';

/**
 * Tracks our own outgoing messages that were rendered optimistically, so that the server
 * echo (echo-message [+ labeled-response]) can be reconciled onto the existing message
 * instead of appearing as a duplicate, and so messages that never got acknowledged can be
 * flagged as failed and manually resent.
 *
 * One instance per network, created alongside the IRC client.
 */
export default class PendingMessages {
    constructor(network) {
        this.network = network;
        // All unresolved entries, oldest first. state: 'pending' | 'failed'
        this.entries = [];
        // label => entry, for exact reconciliation via labeled-response
        this.byLabel = new Map();
        // Message object => entry, for the resend UI
        this.byMessage = new Map();
    }

    isEchoEnabled() {
        return this.network.ircClient.network.cap.isEnabled('echo-message');
    }

    isLabelEnabled() {
        return this.isEchoEnabled() &&
            this.network.ircClient.network.cap.isEnabled('labeled-response');
    }

    /**
     * Send a message to a target, rendering it optimistically into the buffer and tracking
     * it for echo reconciliation when the server supports it. This is the single send path
     * for privmsg/action/notice so every sender gets the same behaviour.
     *
     * opts:
     *   type       privmsg (default), action, notice or tagmsg
     *   targetName wire target if it differs from buffer.name (eg. targeted messages @#chan)
     *   tags       extra message tags to send
     *   message    existing Message object to reuse (resends)
     */
    sendAndTrack(buffer, rawText, opts = {}) {
        let type = opts.type || 'privmsg';

        // A long privmsg/notice is split by irc-framework into several wire messages. If we
        // tracked the whole thing as one optimistic message, each server echo would only
        // carry a fragment and never match our full-text entry - the echoes would show as
        // duplicates and the entry would time out as "not sent". So we split the same way
        // here and track one optimistic message per wire line, keeping a 1:1 mapping with
        // the echoes (and their msgids, so history replay dedups cleanly too).
        // Resends (opts.message) already hold a single block. Actions go through the CTCP
        // path which splits differently and are left as one block (rare to overflow).
        let canSplit = !opts.message &&
            (type === 'privmsg' || type === 'notice') &&
            !buffer.isSpecial() &&
            this.isEchoEnabled();

        if (canSplit) {
            let blocks = this.wireBlocks(rawText);
            if (blocks.length > 1) {
                let first = null;
                blocks.forEach((block, i) => {
                    let m = this.sendBlock(buffer, block, opts);
                    if (i === 0) {
                        first = m;
                    }
                });
                return first;
            }
        }

        return this.sendBlock(buffer, rawText, opts);
    }

    // Split text into the same wire blocks irc-framework's sendMessage would produce, so
    // each optimistic message lines up with exactly one server echo.
    wireBlocks(rawText) {
        let client = this.network.ircClient;
        let maxBytes = (client.options && client.options.message_max_length) || DEFAULT_MAX_BYTES;
        let blocks = [];
        rawText.split(/\r\n|\n|\r/).filter((line) => line).forEach((line) => {
            blocks = blocks.concat([...lineBreak(line, {
                bytes: maxBytes,
                allowBreakingWords: true,
                allowBreakingGraphemes: true,
            })]);
        });
        return blocks;
    }

    sendBlock(buffer, rawText, opts = {}) {
        let network = this.network;
        let state = network.appState;
        let type = opts.type || 'privmsg';
        let targetName = opts.targetName || buffer.name;
        let tags = Object.assign({}, opts.tags);

        // Special buffers (*bnc, *status, ...) are handled by the bouncer itself and
        // never produce a network echo, so don't track or label those sends
        let trackable = ['privmsg', 'action', 'notice'].indexOf(type) > -1 &&
            !buffer.isSpecial();
        let echoEnabled = trackable && this.isEchoEnabled();

        let message = null;
        if (opts.message) {
            // Resending an existing (failed) message - reuse its bubble in the buffer
            message = opts.message;
            message.time = Date.now();
            message.pending = echoEnabled;
            message.send_failed = false;
        } else {
            let formatType = type === 'action' || type === 'notice' ?
                type :
                'privmsg';
            let messageBody = TextFormatting.formatText(formatType, {
                nick: network.nick,
                text: rawText,
            });

            message = state.addMessage(buffer, {
                time: Date.now(),
                nick: network.nick,
                message: messageBody,
                tags: opts.tags || {},
                type: type,
                pending: echoEnabled,
            });
        }

        if (echoEnabled && message) {
            let label = this.isLabelEnabled() ?
                labelPrefix + nextLabelNum++ :
                null;
            if (label) {
                tags.label = label;
            }
            this.trackEntry({
                label: label,
                state: 'pending',
                bufferName: buffer.name,
                targetName: targetName,
                message: message,
                rawText: rawText,
                type: type,
                sentAt: Date.now(),
                timer: null,
            });
        }

        let client = network.ircClient;
        let hasTags = Object.keys(tags).length > 0;
        if (type === 'action') {
            if (hasTags) {
                // irc-framework's action() builds the CTCP via ctcpRequest() which cannot
                // carry tags, so build the ACTION payload ourselves when a label is needed
                client.say(targetName, '\x01ACTION ' + rawText + '\x01', tags);
            } else {
                client.action(targetName, rawText);
            }
        } else if (type === 'notice') {
            client.notice(targetName, rawText, tags);
        } else if (type === 'tagmsg') {
            client.tagmsg(targetName, tags);
        } else {
            client.say(targetName, rawText, tags);
        }

        return message;
    }

    trackEntry(entry) {
        entry.timer = setTimeout(() => this.markFailed(entry), SEND_TIMEOUT_MS);

        this.sweepAckedEntries();
        this.entries.push(entry);
        if (entry.label) {
            this.byLabel.set(entry.label, entry);
        }
        this.byMessage.set(entry.message, entry);

        // Drop the oldest resolved-by-nothing entries if we somehow accumulate too many
        while (this.entries.length > MAX_ENTRIES) {
            this.removeEntry(this.entries[0]);
        }
    }

    /**
     * Try to match an incoming message event (live echo or history replay) against a tracked
     * outgoing message. On a match the existing Message object adopts the server msgid, time
     * and tags, and true is returned so the caller skips adding a duplicate.
     */
    reconcile(event, bufferName) {
        if (this.entries.length === 0) {
            return false;
        }

        let entry = null;

        let label = event.tags && event.tags.label;
        if (label && this.byLabel.has(label)) {
            entry = this.byLabel.get(label);
        } else {
            entry = this.matchHeuristic(event, bufferName);
        }

        if (!entry) {
            return false;
        }

        this.graft(entry, event);
        return true;
    }

    // Content-based reconciliation. This is the PRIMARY path in practice: InspIRCd does
    // not return the labeled-response label on echo-message echoes (proven on v3 and v4),
    // so the label path only ever fires on spec-compliant servers (Ergo/Oragono). We match
    // our own echo by nick + type + content and graft the server msgid.
    //
    // Buffer is deliberately NOT required: on InspIRCd the echo can resolve to a different
    // buffer name than where we optimistically rendered it, and requiring a buffer match
    // caused misses. When several pending sends share the same content, a same-buffer entry
    // is preferred (so identical messages to two channels graft onto the right copy);
    // otherwise the earliest-inserted entry wins, which gives FIFO consumption for rapid
    // duplicates (N identical sends reconcile against N echoes without double-grafting) and
    // lets reordered multi-line echoes each match independently.
    matchHeuristic(event, bufferName) {
        let client = this.network.ircClient;
        // Deliberate: a msgid is required. Without one there is no replay-dedup benefit to
        // grafting, and the risk of consuming an unrelated self-message (eg. another of our
        // clients relayed via znc.in/self-message, which carries no msgid) is much higher.
        // A server with echo-message but no msgid will show the echo as a duplicate.
        if (!event.tags || !event.tags.msgid) {
            return null;
        }
        if (!event.nick || !client.caseCompare(event.nick, client.user.nick)) {
            return null;
        }

        // entries is insertion-ordered, so filter+find both keep FIFO order. Pending entries
        // are recent (SEND_TIMEOUT); failed entries stay matchable with no time limit so a
        // history replay confirming an old "failed" message proves it reached the server.
        let candidates = this.entries.filter(
            (entry) => entry.type === event.type && entry.rawText === event.message
        );
        if (candidates.length === 0) {
            return null;
        }

        let sameBuffer = candidates.find(
            (entry) => client.caseCompare(entry.bufferName, bufferName || '')
        );
        return sameBuffer || candidates[0];
    }

    graft(entry, event) {
        let message = entry.message;
        let buffer = this.network.bufferByName(entry.bufferName);

        let msgid = event.tags.msgid || event.tags['draft/msgid'];
        if (msgid && buffer) {
            buffer.updateMessageId(message, msgid);
        }

        // Adopt the server's authoritative tags & time; strip the label as it is transient
        let tags = Object.assign({}, event.tags);
        delete tags.label;
        message.tags = tags;
        if (event.time) {
            message.server_time = event.time;
        }

        message.pending = false;
        message.send_failed = false;

        this.removeEntry(entry);
    }

    /**
     * The server acknowledged a labeled command without echoing a message back
     * (labeled-response ACK). Eg. kiwibnc ACKs when the upstream cannot carry our label,
     * or for messages it handles itself (*bnc). The message did reach the server so it
     * must never be flagged as failed - but the entry stays tracked: in the heuristic
     * fallback regime the (unlabeled) echo may still arrive later and needs to graft
     * its msgid onto the optimistic message.
     */
    handleAck(label) {
        if (!label || !this.byLabel.has(label)) {
            return false;
        }

        let entry = this.byLabel.get(label);
        clearTimeout(entry.timer);
        entry.state = 'acked';
        entry.ackedAt = Date.now();
        entry.message.pending = false;
        entry.message.send_failed = false;
        return true;
    }

    // Lazily drop acked entries whose echo window has passed
    sweepAckedEntries() {
        let now = Date.now();
        this.entries
            .filter((e) => e.state === 'acked' && now - e.ackedAt > ACKED_TTL_MS)
            .forEach((e) => this.removeEntry(e));
    }

    markFailed(entry) {
        if (entry.state !== 'pending') {
            return;
        }
        entry.state = 'failed';
        entry.message.pending = false;
        entry.message.send_failed = true;
        // The entry stays tracked: a later history replay can still reconcile it (proving
        // it was actually delivered), and the resend UI needs its rawText/type/buffer.
    }

    // Flag every in-flight message as failed, eg. when the connection drops.
    failAll() {
        this.entries.forEach((entry) => {
            clearTimeout(entry.timer);
            this.markFailed(entry);
        });
    }

    canResend(message) {
        let entry = this.byMessage.get(message);
        return !!entry && entry.state === 'failed';
    }

    resend(message) {
        let entry = this.byMessage.get(message);
        if (!entry || entry.state !== 'failed') {
            return false;
        }

        let buffer = this.network.bufferByName(entry.bufferName);
        if (!buffer) {
            return false;
        }

        this.removeEntry(entry);
        this.sendAndTrack(buffer, entry.rawText, {
            type: entry.type,
            targetName: entry.targetName,
            message: message,
        });
        return true;
    }

    removeEntry(entry) {
        clearTimeout(entry.timer);
        let idx = this.entries.indexOf(entry);
        if (idx > -1) {
            this.entries.splice(idx, 1);
        }
        if (entry.label) {
            this.byLabel.delete(entry.label);
        }
        this.byMessage.delete(entry.message);
    }
}
