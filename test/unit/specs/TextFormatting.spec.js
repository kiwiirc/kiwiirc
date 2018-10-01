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
            ['http://example.com', 'http://example.com'],
            ['http://127.0.0.1', 'http://127.0.0.1'],
            ['http://example.com:8080', 'http://example.com:8080'],
            ['http://127.0.0.1:8001', 'http://127.0.0.1:8001'],
            ['http://example.com/test.html?test=foo#bar', 'http://example.com/test.html?test=foo#bar'],
            ['http://127.0.0.1/test.html?test=foo#bar', 'http://127.0.0.1/test.html?test=foo#bar'],
            ['www.example.com', 'http://www.example.com'],
            ['https://www.example.com', 'https://www.example.com'],
            ['https://127.0.0.1/test.html?test=foo#bar', 'https://127.0.0.1/test.html?test=foo#bar'],
        ];

        tests.forEach((c) => {
            let linkified = TextFormatting.linkifyUrls(c[0]);
            expect(linkified.urls[0]).to.equal(c[1]);
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
