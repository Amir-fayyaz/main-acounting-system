import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FaqCount from './FaqCount';

const meta = {
  title: 'blook/faq/FaqCount',
  component: FaqCount,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    count: { control: 'number', description: 'تعداد نتایج (با اعداد فارسی نمایش داده می‌شود)' },
  },
} satisfies Meta<typeof FaqCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    count: 12,
  },
};

export const Single: Story = {
  args: {
    count: 1,
  },
};

export const Empty: Story = {
  args: {
    count: 0,
  },
};
