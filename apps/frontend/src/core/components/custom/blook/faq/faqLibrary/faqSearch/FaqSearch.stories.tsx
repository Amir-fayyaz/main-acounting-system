import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import FaqSearch from './FaqSearch';

const meta = {
  title: 'blook/faq/FaqSearch',
  component: FaqSearch,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    placeholder: { control: 'text', description: 'متن راهنمای ورودی' },
  },
} satisfies Meta<typeof FaqSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

function Controlled(args: { placeholder?: string; initialValue?: string }) {
  const [value, setValue] = useState(args.initialValue ?? '');
  return <FaqSearch {...args} value={value} onChange={setValue} />;
}

export const Default: Story = {
  args: {
    value: '',
    onChange: () => {},
  },
  render: (args) => <Controlled placeholder={args.placeholder} initialValue="" />,
};

export const WithValue: Story = {
  args: {
    value: 'سند',
    onChange: () => {},
  },
  render: (args) => <Controlled placeholder={args.placeholder} initialValue="سند" />,
  parameters: {
    docs: { description: { story: 'با مقدار اولیه؛ دکمه پاک کردن نمایان است.' } },
  },
};
