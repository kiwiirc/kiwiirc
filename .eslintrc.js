module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  extends: 'airbnb-base',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // add your custom rules here
  'rules': {
    'import/no-unresolved': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'indent': ["error", 4],
    "object-shorthand": ["error", "consistent-as-needed"],
    "prefer-template": 0,
    "prefer-const": 0,
    "no-use-before-define": 0,
    "no-param-reassign": ["error", { "props": false }],
    "no-alert": 0,
    "no-unused-vars": ["error", { "args": "none" }],
    "no-restricted-syntax": ["error", "WithStatement"],
    "no-cond-assign": 0,
    "object-shorthand": 0,
  }
}
