module.exports = {
    preset: '@vue/cli-plugin-unit-jest',
    collectCoverage: true,
    collectCoverageFrom: ['/src/**/*.{js,jsx,vue}'],
    coverageDirectory: 'tests/coverage/',
    coverageReporters: ['html', 'text-summary'],
};
