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

    const dedotTests = [
        {
            name: 'keeps flat objects unchanged',
            input: { test1: 'test1' },
            expected: { test1: 'test1' },
        },
        {
            name: 'dedots a single nested key',
            input: {
                test1: {
                    'test2.test3': 'test3',
                },
            },
            expected: {
                test1: {
                    test2: {
                        test3: 'test3',
                    },
                },
            },
        },
        {
            name: 'dedots multiple dotted keys at the same level',
            input: {
                'a.b': 1,
                'a.c': 2,
            },
            expected: {
                a: {
                    b: 1,
                    c: 2,
                },
            },
        },
        {
            name: 'preserves non-dotted siblings',
            input: {
                'a': 1,
                'b.c': 2,
            },
            expected: {
                a: 1,
                b: {
                    c: 2,
                },
            },
        },
        {
            name: 'merges into existing nested objects',
            input: {
                'a': {
                    b: {
                        c: 1,
                    },
                },
                'a.b.d': 2,
            },
            expected: {
                a: {
                    b: {
                        c: 1,
                        d: 2,
                    },
                },
            },
        },
        {
            name: 'does not overwrite existing values when expanding keys',
            input: {
                'a': {
                    b: 1,
                },
                'a.b.c': 2,
            },
            expected: {
                a: {
                    b: {
                        c: 2,
                    },
                },
            },
        },
        {
            name: 'ignores empty path segments',
            input: {
                'a..b': 1,
            },
            expected: {
                a: {
                    b: 1,
                },
            },
        },
        {
            name: 'handles leading and trailing dots',
            input: {
                '.a.b.': 1,
            },
            expected: {
                a: {
                    b: 1,
                },
            },
        },
        {
            name: 'does not dedot inside arrays',
            input: {
                a: [
                    { 'b.c': 1 },
                ],
            },
            expected: {
                a: [
                    { 'b.c': 1 },
                ],
            },
        },
        {
            name: 'preserves null and undefined values',
            input: {
                'a.b': null,
                'c': undefined,
            },
            expected: {
                a: {
                    b: null,
                },
                c: undefined,
            },
        },
        {
            name: 'treats numeric path segments as object keys',
            input: {
                'a.0.b': 'value',
            },
            expected: {
                a: {
                    0: {
                        b: 'value',
                    },
                },
            },
        },
        {
            name: 'is safe when run multiple times',
            input: {
                a: {
                    b: {
                        c: 1,
                    },
                },
            },
            expected: {
                a: {
                    b: {
                        c: 1,
                    },
                },
            },
        },
    ];

    test.each(dedotTests)('dedotObject: $name', ({ input, expected }) => {
        Misc.dedotObject(input);
        expect(input).toMatchObject(expected);
    });
});
