import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutPrinciplesGrid from './AboutPrinciplesGrid';

const meta = {
  title: 'blook/about/AboutPrinciplesGrid',
  component: AboutPrinciplesGrid,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    principles: { description: 'آرایهٔ اصول (number, title, description)' },
  },
} satisfies Meta<typeof AboutPrinciplesGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoPrinciples: Story = {
  args: {
    principles: [
      {
        number: '۰۱',
        title: 'اول اصل',
        description: 'توضیح کوتاه اولین اصل.',
      },
      {
        number: '۰۲',
        title: 'دوم اصل',
        description: 'توضیح کوتاه دومین اصل.',
      },
    ],
  },
  parameters: {
    docs: { description: { story: 'شبکه با تعداد کمتر کارت.' } },
  },
};
