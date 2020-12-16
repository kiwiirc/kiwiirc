// SPDX-FileCopyrightText: 2016 - 2020, Darren Whitlen <darren@kiwiirc.com>
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    presets: [['@vue/cli-plugin-babel/preset', { useBuiltIns: 'entry', modules: 'commonjs' }]],
    plugins: [
        ['@babel/plugin-transform-runtime', { corejs: 3, useESModules: true }],
    ],
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
