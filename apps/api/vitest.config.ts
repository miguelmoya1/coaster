import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const tsconfig = JSON.parse(readFileSync(resolve(__dirname, './tsconfig.json'), 'utf8')) as {
  compilerOptions: { paths: Record<string, string[]> };
};

const alias = Object.entries(tsconfig.compilerOptions.paths)
  .sort(([a], [b]) => b.length - a.length)
  .map(([find, [target]]) => ({
    find,
    replacement: resolve(__dirname, target),
  }));

export default defineConfig({
  test: {
    include: ['**/*.spec.ts'],
    exclude: ['**/*.e2e-spec.ts'],
    globals: true,
    root: './',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      swcrc: false,
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          useDefineForClassFields: false,
        },
      },
    }),
  ],
  resolve: {
    alias,
  },
});
