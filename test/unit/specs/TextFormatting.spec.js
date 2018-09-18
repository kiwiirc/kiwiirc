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
});
