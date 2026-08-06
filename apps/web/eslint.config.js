// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import { readdirSync } from 'node:fs';
import tseslint from 'typescript-eslint';

const domains = readdirSync(new URL('./src/app', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'core' && entry.name !== 'presentation')
  .map((entry) => entry.name);

const domainAliases = domains.map((domain) => `@coaster/${domain}`);

const crossLayerRelativeImports = [...domains, 'core'].map((owner) => ({
  files: [`src/app/${owner}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [...domains, 'core', 'presentation']
              .filter((other) => other !== owner)
              .flatMap((other) => [1, 2, 3, 4].map((depth) => `${'../'.repeat(depth)}${other}/**`)),
            message:
              'Import another layer through its @coaster/* alias. Relative paths are only for files inside the same layer.',
          },
        ],
      },
    ],
  },
}));

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
  ...crossLayerRelativeImports,
  {
    files: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...domainAliases, '**/presentation/**'],
              message:
                'core is the base layer: it must not depend on a domain or on presentation. Invert the dependency with an InjectionToken (see PAYWALL_HANDLER) or move the file into the domain that owns it.',
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
