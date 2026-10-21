import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FaqEmpty from './FaqEmpty';

const meta = {
  title: 'blook/faq/FaqEmpty',
  component: FaqEmpty,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container max-w-[600px] font-taraz" dir="rtl">
        <IconDefs />
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text', description: 'عنوان حالت خالی' },
    description: { control: 'text', description: 'توضیح حالت خالی' },
    actionLabel: { control: 'text', description: 'متن دکمه' },
    onReset: { action: 'reset' },
  },
} satisfies Meta<typeof FaqEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    title: 'چیزی پیدا نشد.',
    description: 'عبارت دیگری را امتحان کنید.',
    actionLabel: 'بازنشانی',
  },
};
