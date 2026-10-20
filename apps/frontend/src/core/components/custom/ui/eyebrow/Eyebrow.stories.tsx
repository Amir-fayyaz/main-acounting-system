import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Eyebrow from './Eyebrow';

const meta = {
  title: 'custom/Eyebrow',
  component: Eyebrow,
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'متن برچسب',
    },
    className: {
      control: 'text',
      description: 'کلاس سفارشی برای تغییر ظاهر',
    },
  },
} satisfies Meta<typeof Eyebrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'درباره تراز',
  },
};

export const SectionLabel: Story = {
  args: {
    children: 'اصولی که روی آن‌ها ساخته می‌شویم',
  },
};

export const CustomColor: Story = {
  args: {
    children: 'با رنگ دلخواه',
    className: 'text-manifesto-label before:bg-ink',
  },
};
