import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactCopy from './ContactCopy';

const meta = {
  title: 'blook/contact/ContactCopy',
  component: ContactCopy,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz max-w-[420px]" dir="rtl">
        <IconDefs />
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text', description: 'عنوان (دو خط با \\n)' },
    description: { control: 'text', description: 'توضیح زیر عنوان' },
  },
} satisfies Meta<typeof ContactCopy>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnePath: Story = {
  args: {
    paths: [
      {
        icon: 'wallet',
        title: 'انتخاب پلن برای شرکت',
        description: 'ظرفیت کاربران و اسناد را کنار هم مقایسه کنید.',
        linkLabel: 'دیدن تعرفه‌ها',
        href: '/pricing',
      },
    ],
  },
};
