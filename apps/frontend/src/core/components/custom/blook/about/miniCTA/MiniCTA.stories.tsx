import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MiniCTA from './MiniCTA';

const meta = {
  title: 'blook/about/MiniCTA',
  component: MiniCTA,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <IconDefs />
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text', description: 'عنوان بنر' },
    description: { control: 'text', description: 'توضیح بنر' },
    buttonLabel: { control: 'text', description: 'متن دکمه' },
    buttonHref: { control: 'text', description: 'مقصد دکمه' },
  },
} satisfies Meta<typeof MiniCTA>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    title: 'آمادهٔ امتحانید؟',
    description: 'همین الان با داده‌های نمونه شروع کنید.',
    buttonLabel: 'شروع رایگان',
    buttonHref: '/auth',
  },
};
