import { BarChart3, Landmark, Receipt, Shield, Sparkles } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutIntroVisual from './AboutIntroVisual';

const meta = {
  title: 'blook/about/AboutIntroVisual',
  component: AboutIntroVisual,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
                <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text', description: 'عنوان باکس (با \\n جدا کن)' },
    note: { control: 'text', description: 'توضیح زیر عنوان' },
  },
} satisfies Meta<typeof AboutIntroVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    title: 'یک رویداد،\nیک مسیر روشن.',
    note: 'توضیح دلخواه برای باکس تاریک.',
    steps: [
      { icon: Receipt, title: 'ثبت سند', note: 'خودکار' },
      { icon: Landmark, title: 'تطبیق بانکی', note: 'پیشنهادی' },
      { icon: BarChart3, title: 'گزارش مالی', note: 'آمیاده' },
      { icon: Shield, title: 'تأیید نهایی', note: 'با شما' },
    ],
  },
};

export const SingleStep: Story = {
  args: {
    steps: [{ icon: Sparkles, title: 'یک مرحله', note: 'ساده' }],
  },
  parameters: {
    docs: { description: { story: 'با یک مرحله، همان ردیف برجسته می‌شود.' } },
  },
};
