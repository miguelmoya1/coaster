import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const srcDirs = readdirSync(resolve(__dirname, './src'), { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory() && dirent.name !== '__mocks__')
  .map((dirent) => dirent.name);

const aliases = srcDirs.reduce(
  (acc, dir) => {
    acc[`@${dir}`] = resolve(__dirname, `./src/${dir}`);
    return acc;
  },
  { src: resolve(__dirname, './src') } as Record<string, string>,
);

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
    alias: aliases,
  },
});
