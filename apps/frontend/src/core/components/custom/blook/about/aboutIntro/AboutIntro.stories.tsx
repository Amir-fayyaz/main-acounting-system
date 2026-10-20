import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutIntro from './AboutIntro';

const meta = {
  title: 'blook/about/AboutIntro',
  component: AboutIntro,
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
    eyebrow: { control: 'text', description: 'برچسب بالای عنوان' },
    titleLead: { control: 'text', description: 'بخش اول عنوان' },
    titleAccent: { control: 'text', description: 'بخش رنگی عنوان' },
    description: { control: 'text', description: 'توضیح معرفی' },
    ctaLabel: { control: 'text', description: 'متن دکمهٔ اصلی' },
    ctaHref: { control: 'text', description: 'مقصد دکمهٔ اصلی' },
  },
} satisfies Meta<typeof AboutIntro>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomContent: Story = {
  args: {
    eyebrow: 'معرفی',
    titleLead: 'یک سامانهٔ مالی،',
    titleAccent: 'با اختیار حسابدار.',
    description: 'متن دلخواه برای معرفی محصول.',
    ctaLabel: 'شروع کنید',
    ctaHref: '/auth',
  },
};
