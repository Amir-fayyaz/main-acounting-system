import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactPath from './ContactPath';

const meta = {
  title: 'blook/contact/ContactPath',
  component: ContactPath,
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
    title: { control: 'text', description: 'عنوان مسیر' },
    description: { control: 'text', description: 'توضیح کوتاه مسیر' },
    linkLabel: { control: 'text', description: 'متن لینک' },
    href: { control: 'text', description: 'مقصد لینک' },
  },
} satisfies Meta<typeof ContactPath>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: 'wallet',
    title: 'انتخاب پلن برای شرکت',
    description: 'ظرفیت کاربران و اسناد را کنار هم مقایسه کنید.',
    linkLabel: 'دیدن تعرفه‌ها',
    href: '/pricing',
  },
};

export const Custom: Story = {
  args: {
    icon: 'spark',
    title: 'دستیار هوشمند',
    description: 'پیشنهاد با تراز، تأیید با شما.',
    linkLabel: 'دیدن نمونه',
    href: '/demo',
  },
};
