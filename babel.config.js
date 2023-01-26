module.exports = {
    presets: [
        [
            '@vue/cli-plugin-babel/preset',
            {
                useBuiltIns: 'entry',
                modules: 'commonjs',
                corejs: { version: 3, proposals: true },
            },
        ],
    ],
    plugins: [['@babel/plugin-transform-runtime', { corejs: 3, useESModules: true }]],
    env: {
        test: {
            plugins: [
                [
                    'istanbul',
                    {
                        exclude: ['**/*.spec.js'],
                    },
                ],
            ],
        },
    },
};
