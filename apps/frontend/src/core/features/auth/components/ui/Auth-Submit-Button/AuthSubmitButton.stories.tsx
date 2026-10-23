import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AuthSubmitButton } from './AuthSubmitButton';

const meta = {
  title: 'Auth/AuthSubmitButton',
  component: AuthSubmitButton,
  tags: ['autodocs'],
  args: { children: 'ورود' },
} satisfies Meta<typeof AuthSubmitButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true, loadingLabel: 'در حال ورود...' },
};
