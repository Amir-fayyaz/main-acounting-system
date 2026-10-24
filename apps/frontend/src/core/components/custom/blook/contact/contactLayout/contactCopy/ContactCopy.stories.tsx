import { Wallet } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactCopy from './ContactCopy';

const meta = {
  title: 'blook/contact/ContactCopy',
  component: ContactCopy,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)] max-w-[420px]" dir="rtl">
                <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text', description: 'عنوان (دو خط با \\n)' },
    description: { control: 'text', description: 'توضیح زیر عنوان' },
  },
} satisfies Meta<typeof ContactCopy>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnePath: Story = {
  args: {
    paths: [
      {
        icon: Wallet,
        title: 'انتخاب پلن برای شرکت',
        description: 'ظرفیت کاربران و اسناد را کنار هم مقایسه کنید.',
        linkLabel: 'دیدن تعرفه‌ها',
        href: '/pricing',
      },
    ],
  },
};
