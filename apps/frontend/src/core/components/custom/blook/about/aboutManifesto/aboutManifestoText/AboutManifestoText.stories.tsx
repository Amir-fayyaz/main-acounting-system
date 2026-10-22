import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutManifestoText from './AboutManifestoText';

const meta = {
  title: 'blook/about/AboutManifestoText',
  component: AboutManifestoText,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    children: { control: 'text', description: 'متن شاخص' },
  },
} satisfies Meta<typeof AboutManifestoText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    children: 'اعداد باید در خدمت تصمیم باشند، نه بلعیدن وقت حسابدار.',
  },
};
