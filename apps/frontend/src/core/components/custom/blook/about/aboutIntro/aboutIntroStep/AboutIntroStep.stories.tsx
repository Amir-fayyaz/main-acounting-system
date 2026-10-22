import IconDefs from '@/core/components/custom/ui/icons/IconDefs';
import { tarazIconNames } from '@/core/components/custom/ui/icons/TarazIcon';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AboutIntroStep from './AboutIntroStep';

const meta = {
  title: 'blook/about/AboutIntroStep',
  component: AboutIntroStep,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container bg-visual p-6 font-taraz" dir="rtl">
        <IconDefs />
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
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    step: { icon: 'file', title: 'اطلاعات و مستندات', note: 'یک‌بار ورود' },
  },
};

export const Highlighted: Story = {
  args: {
    step: { icon: 'check', title: 'تأیید حسابدار', note: 'اختیار با شما' },
    isLast: true,
  },
  parameters: {
    docs: { description: { story: 'حالت آخرین مرحله با رنگ برند.' } },
  },
};

export const AllIcons: Story = {
  args: {
    step: { icon: 'file', title: 'آیکون', note: 'نمونه' },
  },
  render: () => (
    <div className="flex flex-col gap-3">
      {tarazIconNames.map((icon) => (
        <AboutIntroStep
          key={icon}
          step={{ icon, title: `آیکون ${icon}`, note: 'نمونه' }}
        />
      ))}
    </div>
  ),
  parameters: {
    docs: { description: { story: 'نمایش همهٔ آیکون‌های sprite در ردیف مرحله.' } },
  },
};
