import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular()],
  test: {
    setupFiles: ['./src/test-setup.ts'],
    include: ['./src/**/*.spec.ts'],
    environment: 'jsdom',
    alias: {
      '@coaster/bars': new URL('./src/app/bars/index.ts', import.meta.url).pathname,
      '@coaster/categories': new URL('./src/app/categories/index.ts', import.meta.url).pathname,
      '@coaster/core': new URL('./src/app/core/index.ts', import.meta.url).pathname,
      '@coaster/exchanges': new URL('./src/app/exchanges/index.ts', import.meta.url).pathname,
      '@coaster/members': new URL('./src/app/members/index.ts', import.meta.url).pathname,
      '@coaster/orders': new URL('./src/app/orders/index.ts', import.meta.url).pathname,
      '@coaster/printer': new URL('./src/app/printer/index.ts', import.meta.url).pathname,
      '@coaster/products': new URL('./src/app/products/index.ts', import.meta.url).pathname,
      '@coaster/roster': new URL('./src/app/roster/index.ts', import.meta.url).pathname,
      '@coaster/shifts': new URL('./src/app/shifts/index.ts', import.meta.url).pathname,
      '@coaster/stats': new URL('./src/app/stats/index.ts', import.meta.url).pathname,
      '@coaster/tables': new URL('./src/app/tables/index.ts', import.meta.url).pathname,
      '@coaster/templates': new URL('./src/app/templates/index.ts', import.meta.url).pathname,
      '@coaster/env': new URL('./src/environments/environment.ts', import.meta.url).pathname,
    },
  },
});
