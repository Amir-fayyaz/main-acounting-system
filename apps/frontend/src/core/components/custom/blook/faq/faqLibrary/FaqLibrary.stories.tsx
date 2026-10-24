import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FaqLibrary from './FaqLibrary';

const meta = {
  title: 'blook/faq/FaqLibrary',
  component: FaqLibrary,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    categories: { description: 'آرایه دسته‌بندی‌ها' },
    entries: { description: 'آرایه پرسش‌ها' },
  },
} satisfies Meta<typeof FaqLibrary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ThreeEntries: Story = {
  args: {
    entries: [
      {
        id: 'a',
        category: 'start',
        question: 'برای شروع به چه چیزی نیاز دارم؟',
        answer: 'فقط یک شرکت و اطلاعات پایه. باقی مراحل در محیط نمونه قابل بررسی است.',
      },
      {
        id: 'b',
        category: 'ai',
        question: 'آیا دستیار هوشمند رایگان است؟',
        answer: 'در نسخه نمایشی، امکانات دستیار با داده نمونه در دسترس است.',
      },
      {
        id: 'c',
        category: 'pricing',
        question: 'تعرفه‌ها واقعی‌اند؟',
        answer: 'خیر، تمام قیمت‌ها داده نمونه‌اند.',
      },
    ],
  },
  parameters: {
    docs: { description: { story: 'کتابخانه با تعداد کم پرسش برای آزمایش سرچ و فیلتر.' } },
  },
};
