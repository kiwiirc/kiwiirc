import * as TextFormatting from '@/helpers/TextFormatting';

describe('TextFormatting.js', function() {
    it('should return valid channel links', function() {
        let tests = [
            ['#channel', '<a class="u-link kiwi-channel" data-channel-name="#channel">#channel</a>'],
            ['#channel;', '<a class="u-link kiwi-channel" data-channel-name="#channel">#channel</a>;'],
            ['#chan;nel', '<a class="u-link kiwi-channel" data-channel-name="#chan;nel">#chan;nel</a>'],
            ['#channel.', '<a class="u-link kiwi-channel" data-channel-name="#channel">#channel</a>.'],
            ['#chan;el;', '<a class="u-link kiwi-channel" data-channel-name="#chan;el">#chan;el</a>;'],
            ['#chan[n]el,', '<a class="u-link kiwi-channel" data-channel-name="#chan[n]el">#chan[n]el</a>,'],
            ['@#channel:', '@<a class="u-link kiwi-channel" data-channel-name="#channel">#channel</a>:'],
            ['@&channel,', '@<a class="u-link kiwi-channel" data-channel-name="&amp;channel">&amp;channel</a>,'],
        ];

        tests.forEach((c) => {
            let formatted = TextFormatting.linkifyChannels(c[0]);
            expect(formatted).to.equal(c[1]);
        });
    });

    it('should return valid url links', function() {
        let tests = [
            ['www.example.com', 'http://www.example.com'],
            ['http://example.com'],
            ['http://127.0.0.1'],
            ['http://example.com:8080'],
            ['http://127.0.0.1:8001'],
            ['http://example.com/test.html?test=foo#bar'],
            ['http://127.0.0.1/test.html?test=foo#bar'],
            ['https://www.example.com'],
            ['https://127.0.0.1/test.html?test=foo#bar'],
            ['http://2001:0000:1234:0000:0000:C1C0:ABCD:0876/'],
            ['http://[2001:db8:1f70::999:de8:7648:6e8]:100/'],
            ['ldap://[2001:db8::7]/c=GB?objectClass?one'],
        ];

        tests.forEach((c) => {
            let linkified = TextFormatting.linkifyUrls(c[0]);
            let compare = c.length === 2 ? c[1] : c[0];
            expect(linkified.urls[0]).to.equal(compare);
        });
    });

    it('should reject invalid urls', function() {
        let tests = ['test', 'example.com', 'test:8080', '127.0.0.1/test.html'];

        tests.forEach((c) => {
            let linkified = TextFormatting.linkifyUrls(c);
            expect(linkified.urls.length).to.equal(0);
        });
    });
});
