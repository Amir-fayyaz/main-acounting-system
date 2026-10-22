import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactSuccess from './ContactSuccess';

const meta = {
  title: 'blook/contact/ContactSuccess',
  component: ContactSuccess,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)] max-w-[620px]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    name: { control: 'text', description: 'نام کاربر در پیام موفقیت' },
    onReset: { action: 'reset', description: 'بازگشت به فرم برای نوشتن پیام جدید' },
  },
} satisfies Meta<typeof ContactSuccess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'سارا محمدی',
  },
};
