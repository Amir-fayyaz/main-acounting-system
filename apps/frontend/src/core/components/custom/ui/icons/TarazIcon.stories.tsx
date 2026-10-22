import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import IconDefs from './IconDefs';
import TarazIcon, { tarazIconNames } from './TarazIcon';

const meta = {
  title: 'custom/TarazIcon',
  component: TarazIcon,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: [...tarazIconNames],
      description: 'نام آیکون در sprite',
    },
    className: {
      control: 'text',
      description: 'اندازه و رنگ دلخواه (رنگ از currentColor ارث می‌بره)',
    },
  },
  decorators: [
    (Story) => (
      <>
        <IconDefs />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof TarazIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'arrow',
    className: 'size-6',
  },
};

export const AllIcons: Story = {
  args: { name: 'grid', className: 'size-6' },
  render: () => (
    <div className="flex flex-wrap gap-4 text-ink">
      {tarazIconNames.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <TarazIcon className="size-6" name={name} />
          <code className="text-[10px] text-muted-foreground">{name}</code>
        </div>
      ))}
    </div>
  ),
};

export const InheritColor: Story = {
  args: { name: 'spark', className: 'size-6' },
  render: () => (
    <div className="flex items-center gap-4">
      <TarazIcon className="size-6 text-brand" name="spark" />
      <TarazIcon className="size-6 text-ink" name="shield" />
      <TarazIcon className="size-6 text-destructive" name="bell" />
    </div>
  ),
};
