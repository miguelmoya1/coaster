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
    include: ['**/*.e2e-spec.ts'],
    exclude: ['**/*.spec.ts'],
    globals: true,
    root: './',
    globalSetup: ['./test/setup.e2e.ts'],
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      swcrc: false,
    }),
  ],
  resolve: {
    alias,
  },
});
