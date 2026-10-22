import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PrincipleCard from './PrincipleCard';

const meta = {
  title: 'blook/about/PrincipleCard',
  component: PrincipleCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="font-[family-name:var(--font-vazirmatn)] max-w-xs" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    number: { control: 'text', description: 'شمارهٔ اصل' },
    title: { control: 'text', description: 'عنوان اصل' },
    description: { control: 'text', description: 'توضیح اصل' },
  },
} satisfies Meta<typeof PrincipleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    number: '۰۱',
    title: 'از نگاه حسابدار',
    description: 'هر جریان با کار واقعی حسابدار شروع می‌شود؛ از بررسی مستندات تا کنترل نهایی ثبت‌ها.',
  },
};

export const Custom: Story = {
  args: {
    number: '۰۷',
    title: 'اصل سفارشی',
    description: 'متن دلخواه برای نمایش کارت اصل.',
  },
};
