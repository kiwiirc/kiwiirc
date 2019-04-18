import * as Misc from '@/helpers/Misc';

describe('Misc.js', function() {
    it('should find mentions of nickname in text', function() {
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
            expect(doesMention).to.equal(c[2]);
        });
    });
});
