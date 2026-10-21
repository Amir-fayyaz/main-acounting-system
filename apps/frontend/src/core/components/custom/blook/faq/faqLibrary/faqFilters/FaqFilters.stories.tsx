import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import FaqFilters from './FaqFilters';
import { faqCategories } from '../faqData';
import type { FaqCategoryId } from '../faqData';

const meta = {
  title: 'blook/faq/FaqFilters',
  component: FaqFilters,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="tz-container font-taraz" dir="rtl">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    active: {
      control: 'select',
      options: ['all', 'start', 'finance', 'ai', 'pricing', 'data'],
      description: 'دستهٔ فعال',
    },
  },
} satisfies Meta<typeof FaqFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

function Controlled() {
  const [active, setActive] = useState<FaqCategoryId>('all');
  return <FaqFilters active={active} categories={faqCategories} onSelect={setActive} />;
}

export const Default: Story = {
  render: () => <Controlled />,
};
