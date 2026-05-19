module.exports = {
  env: {
    node: true,
    jest: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  extends: ['eslint:recommended', 'airbnb-base'],
  rules: {
    no-console: 'off',
    no-undef: 'error',
    prefer-const: 'error',
    class-methods-use-this: 'error',
  },
};