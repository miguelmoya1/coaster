import angular from '@analogjs/vite-plugin-angular';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const tsconfig = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8')) as {
  compilerOptions: { paths: Record<string, string[]> };
};

const alias = Object.fromEntries(
  Object.entries(tsconfig.compilerOptions.paths).map(([name, [target]]) => [
    name,
    fileURLToPath(new URL(target, import.meta.url)),
  ]),
);

export default defineConfig({
  plugins: [angular()],
  test: {
    setupFiles: ['./src/test-setup.ts'],
    include: ['./src/**/*.spec.ts'],
    environment: 'jsdom',
    alias,
  },
});
