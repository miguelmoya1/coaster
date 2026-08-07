// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import { readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';

const modules = readdirSync(new URL('./src', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== '__mocks__')
  .map((entry) => entry.name);

/** @type {import('eslint').Linter.Config[]} */
const crossModuleRelativeImports = modules.map((owner) => ({
  files: [`src/${owner}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: modules
              .filter((other) => other !== owner)
              .flatMap((other) => [1, 2, 3, 4].map((depth) => `${'../'.repeat(depth)}${other}/**`)),
            message:
              'Import another module through its @coaster/<module> barrel. Relative paths are only for files inside the same module.',
          },
        ],
      },
    ],
  },
}));

export default defineConfig(
  {
    ignores: ['src/core/prisma/client/**'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  ...crossModuleRelativeImports,
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@coaster/ai',
                '@coaster/auth',
                '@coaster/bar-members',
                '@coaster/bar-subscription',
                '@coaster/bars',
                '@coaster/categories',
                '@coaster/email',
                '@coaster/media',
                '@coaster/orders',
                '@coaster/printer',
                '@coaster/products',
                '@coaster/shift-exchanges',
                '@coaster/shifts',
                '@coaster/stats',
                '@coaster/stripe',
                '@coaster/tables',
                '@coaster/templates',
                '@coaster/users',
                '@coaster/websockets',
              ],
              message: 'core is the base layer: it must not depend on a feature module.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
);
