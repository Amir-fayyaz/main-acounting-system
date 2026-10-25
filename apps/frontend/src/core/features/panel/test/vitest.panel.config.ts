import { mergeConfig } from 'vitest/config';
import baseConfig from '../../../../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    include: ['src/core/features/panel/test/**/*.test.tsx'],
    deps: {
      optimizer: {
        client: {
          enabled: true,
          include: [
            'react',
            'react-dom',
            'react-dom/client',
            'radix-ui',
            'lucide-react',
            'input-otp',
          ],
        },
      },
    },
  },
});
