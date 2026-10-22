import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/core/test/setup.ts'],
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000/api',
    },
  },
});
