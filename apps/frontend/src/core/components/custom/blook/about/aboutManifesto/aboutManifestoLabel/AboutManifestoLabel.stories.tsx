import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutManifestoLabel from './AboutManifestoLabel';

const meta = {
  title: 'blook/about/AboutManifestoLabel',
  component: AboutManifestoLabel,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
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
