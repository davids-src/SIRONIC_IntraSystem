import baseConfig from '@erp/eslint-config/base';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts', 'e2e/**', 'public/sw.js'],
  },
];
