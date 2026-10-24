import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutPrinciplesTitle from './AboutPrinciplesTitle';

const meta = {
  title: 'blook/about/AboutPrinciplesTitle',
  component: AboutPrinciplesTitle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    eyebrow: { control: 'text', description: 'برچسب بالای بخش' },
    title: { control: 'text', description: 'عنوان بخش' },
  },
} satisfies Meta<typeof AboutPrinciplesTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    eyebrow: 'نسخهٔ کوتاه',
    title: 'فقط دو اصل مهم.',
  },
};
