module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                useBuiltIns: 'usage',
                corejs: 3,
                targets: {
                    browsers: ['last 2 versions', 'ie >= 10'],
                },
            },
        ],
    ],
    comments: false,
    env: {
        test: {
            plugins: [
                'istanbul',
            ],
        },
    },
    // sourceType: 'unambiguous',
};
