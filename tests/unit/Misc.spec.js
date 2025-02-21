import * as Misc from '@/helpers/Misc';

describe('Misc.js', () => {
    it('should find mentions of nickname in text', () => {
        let tests = [
            ['foo', 'foo', true], // on its own
            ['Foo', 'foo', true], // different case
            ['foo bar baz', 'foo', true], // start of line
            ['baz foo bar', 'foo', true], // in middle of line
            ['bar baz foo', 'foo', true], // end of line
            ['missing', 'foo', false], // doesnt exist in text
            ['baz food bar', 'foo', false], // dont trigger on substrings
            ['hello food foo bar', 'foo', true], // when substring exists previously
            ['hello, foo?', 'foo', true], // punctuation test
            ['foo: hello', 'foo', true], // another
            ['hello (foo)', 'foo', true], // another
        ];

        tests.forEach((c) => {
            let doesMention = Misc.mentionsNick(c[0], c[1]);
            expect(doesMention).toEqual(c[2]);
        });
    });

    const networkParseTest = [
        ['example|irc.example.com:6667', 'irc://irc.example.com:6667', { name: 'example', server: 'irc.example.com', port: 6667, tls: false, direct: false }],
        ['example|irc.example.com:+6697', 'ircs://irc.example.com:6697', { name: 'example', server: 'irc.example.com', port: 6697, tls: true, direct: false }],
        ['irc.example.com:+6697', 'ircs://irc.example.com:6697', { name: 'irc.example.com', server: 'irc.example.com', port: 6697, tls: true, direct: false }],
        ['example|irc://irc.example.com', 'irc://irc.example.com:6667', { name: 'example', server: 'irc.example.com', port: 6667, tls: false, direct: false }],
        ['example|ircs://irc.example.com', 'ircs://irc.example.com:6697', { name: 'example', server: 'irc.example.com', port: 6697, tls: true, direct: false }],
        ['example|ws://irc.example.com:8067', 'ws://irc.example.com:8067', { name: 'example', server: 'irc.example.com', port: 8067, tls: false, direct: true }],
        ['example|wss://irc.example.com:8097', 'wss://irc.example.com:8097', { name: 'example', server: 'irc.example.com', port: 8097, tls: true, direct: true }],
        ['example|ws://irc.example.com', 'ws://irc.example.com:8067', { name: 'example', server: 'irc.example.com', port: 8067, tls: false, direct: true }],
        ['example|wss://irc.example.com', 'wss://irc.example.com:8097', { name: 'example', server: 'irc.example.com', port: 8097, tls: true, direct: true }],
        ['ws://irc.example.com', 'ws://irc.example.com:8067', { name: 'irc.example.com', server: 'irc.example.com', port: 8067, tls: false, direct: true }],
        ['example|wss://irc.example.com:8097/some/path/', 'wss://irc.example.com:8097/some/path/', { name: 'example', server: 'irc.example.com', port: 8097, tls: true, direct: true, path: '/some/path/' }],
        ['example|wss://irc.example.com:8097/some/path/#chan1,#chan2', 'wss://irc.example.com:8097/some/path/', { name: 'example', server: 'irc.example.com', port: 8097, tls: true, direct: true, path: '/some/path/', channels: '#chan1,#chan2' }],
        ['example|wss://irc.example.com/some/path', 'wss://irc.example.com:8097/some/path', { name: 'example', server: 'irc.example.com', port: 8097, tls: true, direct: true, path: '/some/path' }],
        ['example|irc.example.com#test123', 'irc://irc.example.com:6667', { name: 'example', server: 'irc.example.com', port: 6667, tls: false, direct: false, channels: '#test123' }],
        ['[2600:1406:bc00:53::b81e:94ce]', 'irc://[2600:1406:bc00:53::b81e:94ce]:6667', { name: '[2600:1406:bc00:53::b81e:94ce]', server: '[2600:1406:bc00:53::b81e:94ce]', port: 6667, tls: false, direct: false }],
        ['23.192.228.84', 'irc://23.192.228.84:6667', { name: '23.192.228.84', server: '23.192.228.84', port: 6667, tls: false, direct: false }],
    ];
    test.each(networkParseTest)('should parse network preset [%#]', (item, uri, obj, ...args) => {
        let server = Misc.parsePresetServer(item);
        expect(server.toUri()).toEqual(uri);
        expect(server).toMatchObject(obj);
    });
});
