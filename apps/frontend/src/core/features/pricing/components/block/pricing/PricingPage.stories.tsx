import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PricingPage } from './PricingPage';

const meta = {
  title: 'Features/Pricing/PricingPage',
  component: PricingPage,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PricingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
