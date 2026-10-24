import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FaqHeroDescription from './FaqHeroDescription';

const meta = {
  title: 'blook/faq/FaqHeroDescription',
  component: FaqHeroDescription,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    text: { control: 'text', description: 'متن توضیح' },
  },
} satisfies Meta<typeof FaqHeroDescription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Short: Story = {
  args: {
    text: 'پاسخ پرسش‌های پرتکرار شما.',
  },
};
