import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactHero from './ContactHero';

const meta = {
  title: 'blook/contact/ContactHero',
  component: ContactHero,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
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
} satisfies Meta<typeof ContactHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    eyebrow: 'گفت‌وگو',
    titleLead: 'درباره تراز،',
    titleAccent: 'همین حالا بپرسید.',
    description: 'کوتاه و روشن بنویسید تا سریع‌تر پاسخ بگیریم.',
  },
};
