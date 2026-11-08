import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    server: {
      deps: {
        // Keep the shared OTP input on the same React instance as the test renderer.
        inline: ['input-otp'],
      },
    },
    setupFiles: ['./src/core/test/setup.ts'],
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000/api',
    },
  },
});
