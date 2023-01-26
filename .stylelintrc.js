module.exports = {
    extends: ['stylelint-config-standard', 'stylelint-config-recommended-vue'],
    overrides: [
        {
            files: ['**/*.html'],
            customSyntax: 'postcss-html',
        },
    ],
    rules: {
        'indentation': 4,
        'no-descending-specificity': null,
        'declaration-no-important': true,

        // To review
        'alpha-value-notation': null,
        'color-function-notation': null,
        'no-empty-first-line': null,
        'property-no-vendor-prefix': null,
        'selector-attribute-quotes': null,
        'selector-class-pattern': null,
        'shorthand-property-no-redundant-values': null,
        'string-quotes': null,
    },
};
