import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutManifesto from './AboutManifesto';

const meta = {
  title: 'blook/about/AboutManifesto',
  component: AboutManifesto,
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
    label: { control: 'text', description: 'لیبل کناری بنر' },
    text: { control: 'text', description: 'جملهٔ شاخص بنر' },
  },
} satisfies Meta<typeof AboutManifesto>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomText: Story = {
  args: {
    label: 'شعار ما',
    text: 'اعداد باید در خدمت تصمیم باشند، نه بلعیدن وقت حسابدار.',
  },
};
