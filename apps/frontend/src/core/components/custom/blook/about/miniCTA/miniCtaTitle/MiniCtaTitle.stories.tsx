import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MiniCtaTitle from './MiniCtaTitle';

const meta = {
  title: 'blook/about/MiniCtaTitle',
  component: MiniCtaTitle,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    children: { control: 'text', description: 'متن عنوان' },
  },
} satisfies Meta<typeof MiniCtaTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    children: 'آمادهٔ امتحانید؟',
  },
};
