import { Check, FileText, Sparkles, Wallet } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutIntroStep from './AboutIntroStep';

const meta = {
  title: 'blook/about/AboutIntroStep',
  component: AboutIntroStep,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="mx-auto w-full px-5 bg-ink-soft p-6 font-[family-name:var(--font-vazirmatn)]" dir="rtl">
                <Story />
      </div>
    ),
  ],
  argTypes: {
    isLast: {
      control: 'boolean',
      description: 'آیا آخرین مرحله است (حالت برجسته)',
    },
    step: {
      description: 'دادهٔ مرحله (icon, title, note)',
    },
  },
} satisfies Meta<typeof AboutIntroStep>;

export default meta;
const iconSamples = [
  { name: 'file', icon: FileText },
  { name: 'check', icon: Check },
  { name: 'spark', icon: Sparkles },
  { name: 'wallet', icon: Wallet },
];

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    step: { icon: FileText, title: 'اطلاعات و مستندات', note: 'یک‌بار ورود' },
  },
};

export const Highlighted: Story = {
  args: {
    step: { icon: Check, title: 'تأیید حسابدار', note: 'اختیار با شما' },
    isLast: true,
  },
  parameters: {
    docs: { description: { story: 'حالت آخرین مرحله با رنگ برند.' } },
  },
};

export const AllIcons: Story = {
  args: {
    step: { icon: FileText, title: 'آیکون', note: 'نمونه' },
  },
  render: () => (
    <div className="flex flex-col gap-3">
      {iconSamples.map(({ name, icon }) => (
        <AboutIntroStep
          key={name}
          step={{ icon, title: `آیکون ${name}`, note: 'نمونه' }}
        />
      ))}
    </div>
  ),
  parameters: {
    docs: { description: { story: 'نمایش چند آیکون در ردیف مرحله.' } },
  },
};
