import Eyebrow from '@/core/components/custom/ui/eyebrow/Eyebrow';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutPrinciples from './AboutPrinciples';

const meta = {
  title: 'blook/about/AboutPrinciples',
  component: AboutPrinciples,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    eyebrow: { control: 'text', description: 'برچسب بالای بخش' },
    title: { control: 'text', description: 'عنوان بخش' },
    ribbonTitle: { control: 'text', description: 'عنوان ریبون (با \\n جدا کن)' },
    ribbonText: { control: 'text', description: 'متن ریبون' },
  },
} satisfies Meta<typeof AboutPrinciples>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TwoPrinciples: Story = {
  args: {
    eyebrow: 'نسخهٔ کوتاه',
    title: 'فقط دو اصل مهم.',
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
    ribbonTitle: 'یک خط شاخص،\nیک خط توضیح.',
    ribbonText: 'متن ریبون سفارشی.',
  },
  parameters: {
    docs: { description: { story: 'مثال کوتاه با تعداد کمتر کارت.' } },
  },
};

export const WithoutEyebrowDemo: Story = {
  args: {},
  render: () => (
    <div className="space-y-4">
      <Eyebrow>ترکیب با اتم Eyebrow</Eyebrow>
      <AboutPrinciples eyebrow="" title="بدون برچسب" />
    </div>
  ),
};
