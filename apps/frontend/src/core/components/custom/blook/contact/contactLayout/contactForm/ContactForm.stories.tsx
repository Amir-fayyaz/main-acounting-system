import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContactForm from './ContactForm';

const meta = {
  title: 'blook/contact/ContactForm',
  component: ContactForm,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz max-w-[620px]" dir="rtl">
        <IconDefs />
        <Story />
      </div>
    ),
  ],
  argTypes: {
    topics: { control: false, description: 'گزینه‌های موضوع پیام' },
  },
} satisfies Meta<typeof ContactForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomTopics: Story = {
  args: {
    topics: [
      { value: 'invoice', label: 'فاکتور و اسناد' },
      { value: 'bank', label: 'بانک و تطبیق' },
    ],
  },
};
