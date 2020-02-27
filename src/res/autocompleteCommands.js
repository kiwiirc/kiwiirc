'kiwi public';

/* eslint-disable */

// command descriptions can be either a static string or a translation key prefixed with locale_id_
export default [
    { command: 'msg', alias: [], locale_description: 'Send a message' },
    { command: 'action', alias: [], locale_description: 'Do something physical' },
    { command: 'join', alias: [], locale_description: 'Join a channel' },
    { command: 'part', alias: [], locale_description: 'Leave a channel' },
    { command: 'cycle', alias: [], locale_description: 'Leave, then re-join a channel' },
    { command: 'nick', alias: [], locale_description: 'Change your nickname' },
    { command: 'query', alias: [], locale_description: 'Start a private conversation with someone' },
    { command: 'invite', alias: [], locale_description: 'Invite somebody into the channel' },
    { command: 'topic', alias: [], locale_description: 'Set the topic for this channel' },
    { command: 'notice', alias: [], locale_description: 'Send a notice' },
    { command: 'quote', alias: [], locale_description: 'Send a raw command to the IRC server' },
    { command: 'kick', alias: [], locale_description: 'Kick somebody from the channel' },
    { command: 'clear', alias: [], locale_description: 'Clear all messages from this window' },
    { command: 'ctcp', alias: [], locale_description: 'Send a CTCP command to somebody' },
    { command: 'quit', alias: [], locale_description: 'Disconnect from the IRC server' },
    { command: 'server', alias: [], locale_description: 'Connect to a new IRC network' },
    { command: 'whois', alias: [], locale_description: 'Request information on somebody' },
    { command: 'whowas', alias: [], locale_description: 'Request information on somebody that disconnected recently' },
    { command: 'away', alias: [], locale_description: 'Set yourself as away' },
    { command: 'back', alias: ['active'], locale_description: 'Set yourself as active' },
    { command: 'encoding', alias: [], locale_description: 'Change your connection encoding' },
    { command: 'ignore', alias: [], locale_description: 'Ignore messages from somebody' },
    { command: 'unignore', alias: [], locale_description: 'Stop ignoring somebody' },
    { command: 'dice', alias: [], locale_description: 'Roll a Dice' },
];
