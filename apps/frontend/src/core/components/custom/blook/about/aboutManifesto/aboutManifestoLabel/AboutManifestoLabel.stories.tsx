import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutManifestoLabel from './AboutManifestoLabel';

const meta = {
  title: 'blook/about/AboutManifestoLabel',
  component: AboutManifestoLabel,
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
    children: { control: 'text', description: 'متن لیبل' },
  },
} satisfies Meta<typeof AboutManifestoLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    children: 'شعار ما',
  },
};
