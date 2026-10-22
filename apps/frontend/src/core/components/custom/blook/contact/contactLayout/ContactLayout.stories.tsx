import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactLayout from './ContactLayout';

const meta = {
  title: 'blook/contact/ContactLayout',
  component: ContactLayout,
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
    title: { control: 'text', description: 'عنوان ستون سمت راست (دو خط با \\n)' },
    description: { control: 'text', description: 'توضیح زیر عنوان' },
  },
} satisfies Meta<typeof ContactLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    title: 'درباره چه چیزی،\nمی‌خواهید حرف بزنیم؟',
    description: 'هر چه جزئیات بیشتری بنویسید، گفت‌وگوی بهتری خواهیم داشت.',
  },
};
