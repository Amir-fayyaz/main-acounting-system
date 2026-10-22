import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MiniCtaDescription from './MiniCtaDescription';

const meta = {
  title: 'blook/about/MiniCtaDescription',
  component: MiniCtaDescription,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    children: { control: 'text', description: 'متن توضیح' },
  },
} satisfies Meta<typeof MiniCtaDescription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    children: 'همین الان با داده‌های نمونه شروع کنید.',
  },
};
