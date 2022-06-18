module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    QRCode: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
  },
};
