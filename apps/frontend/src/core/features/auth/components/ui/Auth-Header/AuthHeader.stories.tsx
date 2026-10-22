import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AuthHeader } from './AuthHeader';

const meta = {
  title: 'Auth/AuthHeader',
  component: AuthHeader,
  tags: ['autodocs'],
  args: {
    title: 'ورود به حساب',
    description: 'خوش برگشتید. برای ادامه وارد شوید.',
  },
} satisfies Meta<typeof AuthHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDescription: Story = {
  args: { description: undefined },
};
