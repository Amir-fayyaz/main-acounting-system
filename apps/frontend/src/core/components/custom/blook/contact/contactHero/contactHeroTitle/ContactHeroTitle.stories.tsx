import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactHeroTitle from './ContactHeroTitle';

const meta = {
  title: 'blook/contact/ContactHeroTitle',
  component: ContactHeroTitle,
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
  },
} satisfies Meta<typeof ContactHeroTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    eyebrow: 'ارتباط با تراز',
    titleLead: 'یک پرسش کوتاه،',
    titleAccent: 'یک پاسخ روشن.',
  },
};
