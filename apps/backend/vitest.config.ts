import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * NestJS 12 packages are ESM-only, so the backend runs and tests as ESM.
 *
 * SWC is used instead of the TypeScript compiler for tests because Nest's
 * dependency injection relies on `emitDecoratorMetadata`, which esbuild (Vitest's
 * default transformer) does not emit.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2023',
        keepClassNames: true,
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.module.ts', 'src/main.ts'],
    },
  },
});
