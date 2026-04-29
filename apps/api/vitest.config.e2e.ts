import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.e2e-spec.ts'],
    exclude: ['**/*.spec.ts'],
    globals: true,
    root: './',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      swcrc: false,
    }),
  ],
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
    },
  },
});
