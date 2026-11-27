module.exports = {
    extends: ['stylelint-config-standard', 'stylelint-config-recommended-vue'],
    plugins: ['@stylistic/stylelint-plugin'],
    overrides: [
        {
            files: ['**/*.html'],
            customSyntax: 'postcss-html',
        },
    ],
    rules: {
        'alpha-value-notation': null,
        'color-function-alias-notation': null,
        'color-function-notation': null,
        'declaration-block-no-redundant-longhand-properties': [true, {
            ignoreShorthands: ['inset', 'overflow'],
        }],
        'declaration-no-important': true,
        'media-feature-range-notation': 'prefix',
        'no-descending-specificity': null,
        'property-no-vendor-prefix': null,
        'selector-class-pattern': null,
        'shorthand-property-no-redundant-values': null,
        '@stylistic/indentation': 4,
        '@stylistic/string-quotes': 'single',
    },
};
