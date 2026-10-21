import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutIntroCta from './AboutIntroCta';

const meta = {
  title: 'blook/about/AboutIntroCta',
  component: AboutIntroCta,
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
    label: { control: 'text', description: 'متن دکمه' },
    href: { control: 'text', description: 'مقصد دکمه' },
  },
} satisfies Meta<typeof AboutIntroCta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    label: 'شروع کنید',
    href: '/auth',
  },
};
