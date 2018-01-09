module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  extends: 'airbnb-base',
  env: {
    "browser": true,
  },
  // required to lint *.vue files
  plugins: [
    'html',
    'vue',
  ],
  // add your custom rules here
  'rules': {
    'import/no-unresolved': 0,
    'import/no-extraneous-dependencies': 0,
    'import/extensions': 0,
    'import/first': ['error', ["builtin", "external", "parent", "sibling", "index"]],
    'import/prefer-default-export': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'indent': ["error", 4],
    "prefer-template": 0,
    "prefer-const": 0,
    "prefer-destructuring": 0,
    "prefer-promise-reject-errors": 0,
    "no-multi-assign": 0,
    "no-plusplus": 0,
    "no-continue": 0,
    "no-use-before-define": 0,
    "no-param-reassign": ["error", { "props": false }],
    "no-alert": 0,
    'no-mixed-operators': 0,
    "no-unused-vars": ["error", { "args": "none" }],
    "no-restricted-syntax": ["error", "WithStatement"],
    "no-cond-assign": 0,
    "object-shorthand": 0,
    "class-methods-use-this": 0,
    "arrow-parens": 0,
    "comma-dangle": ["error", {
        "arrays": "always-multiline",
        "objects": "always-multiline",
        "imports": "never",
        "exports": "never",
        "functions": "ignore"
    }],
    "no-prototype-builtins": 0,
    "no-lonely-if": 0,
    "no-control-regex": 0,
    "function-paren-newline": 0,
  }
}
