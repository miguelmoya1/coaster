import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular()],
  test: {
    setupFiles: ['./src/test-setup.ts'],
    include: ['./src/**/*.spec.ts'],
    environment: 'jsdom',
    server: {
      deps: {
        inline: ['rxfire', '@angular/fire'],
      },
    },
  },
});
