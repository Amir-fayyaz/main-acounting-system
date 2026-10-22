import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FaqHero from './FaqHero';

const meta = {
  title: 'blook/faq/FaqHero',
  component: FaqHero,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    eyebrow: { control: 'text', description: 'برچسب بالای عنوان' },
    titleLead: { control: 'text', description: 'بخش اول عنوان' },
    titleAccent: { control: 'text', description: 'بخش رنگی عنوان' },
    description: { control: 'text', description: 'توضیح زیر عنوان' },
  },
} satisfies Meta<typeof FaqHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    eyebrow: 'راهنما',
    titleLead: 'درباره تراز،',
    titleAccent: 'هر چه بپرسید.',
    description: 'پاسخ کوتاه و روشن برای پرسش‌های شما.',
  },
};
