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
    alias: aliases,
  },
});
