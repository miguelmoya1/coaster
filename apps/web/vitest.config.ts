import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

/**
 * "paths": {
      "@coaster/bars": ["./src/app/bars/index.ts"],
      "@coaster/categories": ["./src/app/categories/index.ts"],
      "@coaster/core": ["./src/app/core/index.ts"],
      "@coaster/exchanges": ["./src/app/exchanges/index.ts"],
      "@coaster/members": ["./src/app/members/index.ts"],
      "@coaster/orders": ["./src/app/orders/index.ts"],
      "@coaster/products": ["./src/app/products/index.ts"],
      "@coaster/roster": ["./src/app/roster/index.ts"],
      "@coaster/shared": ["./src/app/shared/index.ts"],
      "@coaster/shifts": ["./src/app/shifts/index.ts"],
      "@coaster/tables": ["./src/app/tables/index.ts"],
      "@coaster/env": ["./src/environments/environment.ts"]
    }
 */

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
      '@coaster/products': new URL('./src/app/products/index.ts', import.meta.url).pathname,
      '@coaster/roster': new URL('./src/app/roster/index.ts', import.meta.url).pathname,
      '@coaster/shared': new URL('./src/app/shared/index.ts', import.meta.url).pathname,
      '@coaster/shifts': new URL('./src/app/shifts/index.ts', import.meta.url).pathname,
      '@coaster/tables': new URL('./src/app/tables/index.ts', import.meta.url).pathname,
      '@coaster/templates': new URL('./src/app/templates/index.ts', import.meta.url).pathname,
      '@coaster/env': new URL('./src/environments/environment.ts', import.meta.url).pathname,
    },
    server: {
      deps: {
        inline: ['rxfire', '@angular/fire'],
      },
    },
  },
});
