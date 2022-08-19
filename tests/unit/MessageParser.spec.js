import parseMessage from '@/libs/MessageParser';

describe('MessageParser.js', () => {
    it('should return valid channel blocks', () => {
        let tests = [
            ['#channel', '#channel'],
            ['#channel;', '#channel'],
            ['#chan;nel', '#chan;nel'],
            ['#channel.', '#channel'],
            ['#chan;el;', '#chan;el'],
            ['#chan[n]el,', '#chan[n]el'],
            ['#channel.name,', '#channel.name'],
            ['#channel.name.,', '#channel.name'],
            ['#channel.,', '#channel'],
            ['#channel-name,', '#channel-name'],
            ['#channel_name,', '#channel_name'],
            ['#channel&name,', '#channel&name'],
            ['@#channel:', '#channel'],
            ['@&channel,', '&channel'],
            ['&@#channel,', '#channel'],
            ['&@&channel,', '&channel'],
        ];

        tests.forEach((c) => {
            let blocks = parseMessage(c[0]);
            let channelBlocks = blocks.filter((b) => b.type === 'channel');

            expect(channelBlocks.length).toEqual(1);
            expect(channelBlocks[0].meta.channel).toEqual(c[1]);
        });
    });

    it('should return valid url blocks', () => {
        let tests = [
            ['www.example.com', 'http://www.example.com'],
            ['http://example.com'],
            ['http://127.0.0.1'],
            ['http://example.com:8080'],
            ['http://127.0.0.1:8001'],
            ['http://example.com/test.html?test=foo#bar'],
            ['http://example.computer/some/path/test.html?test=foo#bar'],
            ['http://127.0.0.1/test.html?test=foo#bar'],
            ['https://www.example.com'],
            ['https://127.0.0.1/test.html?test=foo#bar'],
            ['http://2001:0000:1234:0000:0000:C1C0:ABCD:0876/'],
            ['http://[2001:db8:1f70::999:de8:7648:6e8]:100/'],
            ['ldap://[2001:db8::7]/c=GB?objectClass?one'],
            ['(http://example.com)', 'http://example.com', '(', ')'],
        ];

        tests.forEach((c) => {
            let blocks = parseMessage(c[0]);
            let urlBlocks = blocks.filter((b) => b.type === 'url');
            let compare = c.length >= 2 ? c[1] : c[0];

            expect(urlBlocks.length).toEqual(1);
            expect(urlBlocks[0].meta.url).toEqual(compare);
            // check prefix and suffix
            if (c.length === 4) {
                expect(blocks[0].content).toEqual(c[2]);
                expect(blocks[2].content).toEqual(c[3]);
            }
        });
    });

    it('should reject invalid urls', () => {
        let tests = ['test', 'example.com', 'test:8080', '127.0.0.1/test.html'];

        tests.forEach((c) => {
            let blocks = parseMessage(c[0]);
            let urlBlocks = blocks.filter((b) => b.type === 'url');
            expect(urlBlocks.length).toEqual(0);
        });
    });

    it('should return valid user blocks', () => {
        // mock users list
        let users = {
            TESTNICK1: { nick: 'TestNick1', username: 'testnick1', colour: '#a1fc5d' },
            TESTNICK2: { nick: 'TestNick2', username: 'testnick2', colour: '#7363fe' },
            TESTNICK3: { nick: 'TestNick3', username: 'testnick3' },
            TESTNICK4_: { nick: 'Test-Nick4_', username: 'testnick4' },
            'TEST-NICK5': { nick: 'Test-Nick5', username: 'testnick5' },
            'TESTNICK6-': { nick: 'TestNick6-', username: 'testnick6' },
        };
        let tests = [
            ['testnick1', 'testnick1'],
            ['TestNick1'],
            ['TestNick2'],
            ['Testnick3', 'Testnick3'],
            ['testnick1:', 'testnick1'],
            ['@testnick2', 'testnick2'],
            ['@TestNick2:', 'TestNick2'],
            ['tEsTnIcK4_.', 'tEsTnIcK4_'],
            ['test-nick5'],
            ['testnick6-'],
        ];

        tests.forEach((c) => {
            let blocks = parseMessage(c[0], {}, users);
            let userBlocks = blocks.filter((b) => b.type === 'user');
            let compare = c.length === 2 ? c[1] : c[0];

            expect(userBlocks.length).toEqual(1);
            expect(userBlocks[0].meta.user).toEqual(compare);
            expect(userBlocks[0].meta.colour).toEqual(users[compare.toUpperCase()].colour);
        });
    });

    it('should reject invalid users', () => {
        // mock users list
        let users = {
            TESTNICK1: { nick: 'TestNick1', username: 'testnick1' },
            TESTNICK2: { nick: 'TestNick2', username: 'testnick2' },
        };
        let tests = ['notauser', 'ttestnick', 'testnick11', 'ttestnick11'];

        tests.forEach((c) => {
            let blocks = parseMessage(c[0], {}, users);
            let userBlocks = blocks.filter((b) => b.type === 'user');

            expect(userBlocks.length).toEqual(0);
        });
    });
});
