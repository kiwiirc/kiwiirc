/**
 * Command input Alias + re-writing
 *
 * Variables used in aliases:
 *     $1 = first word of input
 *     $N = Nth word of input
 *     $1+2 = first word of input and the next 2 words
 *     $2+4 = second word of input and the next 4 words
 *     $2+ = second word of input and all words after
 *     $variable = variable as set in the vars object
 */

export default class AliasRewriter {
    constructor() {
        // Max alias recursion depth
        this.recursiveDepth = 3;
        // Current alias recursion depth
        this.depth = 0;

        this.aliases = {};
    }


    // Takes an array of words to process!
    processInput(input, vars) {
        let words = input || [];
        let alias = this.aliases[words[0].toLowerCase()];
        let aliasLen;
        let currentAliasWord = '';
        let compiled = [];

        // If an alias wasn't found, return the original input
        if (!alias) return input;

        // Split the alias up into useable words
        alias = alias.split(' ');
        aliasLen = alias.length;

        // Iterate over each word and pop them into the final compiled array.
        // Any $ words are processed with the result ending into the compiled array.
        for (let i = 0; i < aliasLen; i++) {
            currentAliasWord = alias[i];

            // Non $ word
            if (currentAliasWord[0] !== '$') {
                compiled.push(currentAliasWord);
                continue;
            }

            // Refering to an input word ($N)
            if (!isNaN(currentAliasWord[1])) {
                let num = currentAliasWord.match(/\$(\d+)(\+)?(\d+)?/);

                // Did we find anything or does the word it refers to non-existant?
                if (!num || !words[num[1]]) continue;

                if (num[2] === '+' && num[3]) {
                    // Add X number of words
                    compiled = compiled.concat(words.slice(
                        parseInt(num[1], 10),
                        parseInt(num[1], 10) + parseInt(num[3], 10)
                    ));
                } else if (num[2] === '+') {
                    // Add the remaining of the words
                    compiled = compiled.concat(words.slice(parseInt(num[1], 10)));
                } else {
                    // Add a single word
                    compiled.push(words[parseInt(num[1], 10)]);
                }

                continue;
            }


            // Refering to a variable
            if (typeof vars[currentAliasWord.substr(1)] !== 'undefined') {
                // Get the variable
                compiled.push(vars[currentAliasWord.substr(1)]);

                continue;
            }
        }

        return compiled;
    }


    process(input, vars) {
        let line = input || '';
        let words = line.split(' ');
        let firstWord = (words[0] || '').toLowerCase();

        this.depth++;
        if (this.depth >= this.recursiveDepth) {
            this.depth--;
            return line;
        }

        if (this.aliases[firstWord]) {
            words = this.processInput(words, vars);
            firstWord = (words[0] || '').toLowerCase();

            if (this.aliases[firstWord]) {
                words = this.process(words.join(' '), vars).split(' ');
            }
        }

        this.depth--;
        return words.join(' ');
    }
}
