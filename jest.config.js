// SPDX-FileCopyrightText: 2016 - 2020, Darren Whitlen <darren@kiwiirc.com>
// SPDX-License-Identifier: Apache-2.0

module.exports = {
    preset: '@vue/cli-plugin-unit-jest',
    collectCoverage: true,
    collectCoverageFrom: ['/src/**/*.{js,jsx,vue}'],
    coverageDirectory: 'tests/coverage/',
    coverageReporters: ['html', 'text-summary'],
};
