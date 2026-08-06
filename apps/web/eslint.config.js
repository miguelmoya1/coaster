// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'coaster',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'coaster',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@coaster/admin',
                '@coaster/bar-members',
                '@coaster/bar-subscription',
                '@coaster/bars',
                '@coaster/categories',
                '@coaster/exchanges',
                '@coaster/members',
                '@coaster/orders',
                '@coaster/printer',
                '@coaster/products',
                '@coaster/roster',
                '@coaster/shifts',
                '@coaster/stats',
                '@coaster/tables',
                '@coaster/templates',
                '**/presentation/**',
              ],
              message:
                'core is the base layer: it must not depend on a domain or on presentation. Invert the dependency with an InjectionToken (see PAYWALL_HANDLER) or move the file into the domain that owns it.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/app/admin/**/*.ts',
      'src/app/bar-members/**/*.ts',
      'src/app/bar-subscription/**/*.ts',
      'src/app/bars/**/*.ts',
      'src/app/categories/**/*.ts',
      'src/app/exchanges/**/*.ts',
      'src/app/orders/**/*.ts',
      'src/app/printer/**/*.ts',
      'src/app/products/**/*.ts',
      'src/app/roster/**/*.ts',
      'src/app/shifts/**/*.ts',
      'src/app/stats/**/*.ts',
      'src/app/tables/**/*.ts',
      'src/app/templates/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/presentation/**'],
              message: 'A domain must not depend on presentation. Keep the component next to the domain that opens it.',
            },
            {
              group: ['../../*/**'],
              message: 'Import other layers through their @coaster/* alias, not with a relative path.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
