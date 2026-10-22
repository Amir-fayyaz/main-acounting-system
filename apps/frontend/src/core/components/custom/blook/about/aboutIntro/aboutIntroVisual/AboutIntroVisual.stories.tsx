import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutIntroVisual from './AboutIntroVisual';

const meta = {
  title: 'blook/about/AboutIntroVisual',
  component: AboutIntroVisual,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <IconDefs />
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
      { icon: 'receipt', title: 'ثبت سند', note: 'خودکار' },
      { icon: 'bank', title: 'تطبیق بانکی', note: 'پیشنهادی' },
      { icon: 'chart', title: 'گزارش مالی', note: 'آمیاده' },
      { icon: 'shield', title: 'تأیید نهایی', note: 'با شما' },
    ],
  },
};

export const SingleStep: Story = {
  args: {
    steps: [{ icon: 'spark', title: 'یک مرحله', note: 'ساده' }],
  },
  parameters: {
    docs: { description: { story: 'با یک مرحله، همان ردیف برجسته می‌شود.' } },
  },
};
