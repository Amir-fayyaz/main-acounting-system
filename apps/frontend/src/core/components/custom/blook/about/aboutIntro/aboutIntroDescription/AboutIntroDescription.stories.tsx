import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutIntroDescription from './AboutIntroDescription';

const meta = {
  title: 'blook/about/AboutIntroDescription',
  component: AboutIntroDescription,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    text: { control: 'text', description: 'متن توضیح' },
  },
} satisfies Meta<typeof AboutIntroDescription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Short: Story = {
  args: {
    text: 'توضیح کوتاه برای معرفی محصول.',
  },
};
