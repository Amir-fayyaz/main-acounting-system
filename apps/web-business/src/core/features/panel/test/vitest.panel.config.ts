import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../../../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Package and app imports must share the same Next instance for navigation mocks.
    alias: { next: path.resolve(__dirname, '../../../../../node_modules/next') },
  },
  test: {
    include: ['src/core/features/panel/test/**/*.test.tsx'],
    deps: {
      optimizer: {
        client: {
          enabled: true,
          include: [
            'react',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'react-dom',
            'react-dom/client',
            'radix-ui',
            'lucide-react',
            'input-otp',
            'next/link',
            'react-icons/ci',
          ],
        },
      },
    },
  },
});
