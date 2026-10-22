import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FaqItem from './FaqItem';
import { faqEntries } from '../faqData';

const meta = {
  title: 'blook/faq/FaqItem',
  component: FaqItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 max-w-[600px] font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    categoryLabel: { control: 'text', description: 'برچسب دسته بالای پرسش' },
    entry: { description: 'داده پرسش (question, answer, category)' },
  },
} satisfies Meta<typeof FaqItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entry: faqEntries[0],
    categoryLabel: 'شروع کار',
  },
};

export const Custom: Story = {
  args: {
    entry: {
      id: 'custom',
      category: 'finance',
      question: 'آیا می‌توانم گزارش مالی خروجی بگیرم؟',
      answer: 'بله. گزارش‌های پایه در دامنه نسخه نخست تعریف شده‌اند.',
    },
    categoryLabel: 'عملیات مالی',
  },
};
