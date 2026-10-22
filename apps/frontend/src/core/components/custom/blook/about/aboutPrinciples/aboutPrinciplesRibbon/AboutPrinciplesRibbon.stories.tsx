import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutPrinciplesRibbon from './AboutPrinciplesRibbon';

const meta = {
  title: 'blook/about/AboutPrinciplesRibbon',
  component: AboutPrinciplesRibbon,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: 'text', description: 'عنوان ریبون (با \\n جدا کن)' },
    text: { control: 'text', description: 'متن ریبون' },
  },
} satisfies Meta<typeof AboutPrinciplesRibbon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    title: 'یک خط شاخص،\nیک خط توضیح.',
    text: 'متن ریبون سفارشی.',
  },
};
