import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: [
    '../../web/ui/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../apps/frontend/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../apps/web-admin/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../apps/web-business/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],
  framework: '@storybook/nextjs-vite',
};

export default config;
