import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactHeroDescription from './ContactHeroDescription';

const meta = {
  title: 'blook/contact/ContactHeroDescription',
  component: ContactHeroDescription,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz max-w-[570px]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    text: { control: 'text', description: 'متن توضیح زیر عنوان' },
  },
} satisfies Meta<typeof ContactHeroDescription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    text: 'متن دلخواه برای راهنمایی کاربر قبل از پرکردن فرم.',
  },
};
