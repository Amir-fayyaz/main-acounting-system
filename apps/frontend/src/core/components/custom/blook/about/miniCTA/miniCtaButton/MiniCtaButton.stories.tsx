import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import MiniCtaButton from './MiniCtaButton';

const meta = {
  title: 'blook/about/MiniCtaButton',
  component: MiniCtaButton,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container bg-mini-cta p-6 font-taraz" dir="rtl">
        <IconDefs />
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: { control: 'text', description: 'متن دکمه' },
    href: { control: 'text', description: 'مقصد دکمه' },
  },
} satisfies Meta<typeof MiniCtaButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    label: 'شروع رایگان',
    href: '/auth',
  },
};
