import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PasswordInput } from './PasswordInput';

const meta: Meta<typeof PasswordInput> = {
  title: 'Auth/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  args: {
    placeholder: 'رمز عبور را وارد کنید',
  },
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'غیرفعال کردن ورودی',
    },
    required: {
      control: 'boolean',
      description: 'اجباری بودن ورودی',
    },
    autoComplete: {
      control: 'select',
      options: ['current-password', 'new-password', 'off'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: 'MySecret123!',
    readOnly: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const NewPassword: Story = {
  args: {
    placeholder: 'رمز عبور جدید را وارد کنید',
    autoComplete: 'new-password',
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};
