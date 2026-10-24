
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LedgerPanel } from "./LedgerPanel";

const meta = {
  title: "Auth/LedgerPanel",
  component: LedgerPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    title: "مدیریت مالی، شفاف‌تر از همیشه",
    subtitle:
      "تمام جزئیات مالی کسب‌وکار خود را در یک نگاه مدیریت کنید.",
  },
  argTypes: {
    title: {
      control: "text",
      description: "عنوان پنل",
    },
    subtitle: {
      control: "text",
      description: "توضیحات پنل",
    },
  },
} satisfies Meta<typeof LedgerPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongContent: Story = {
  args: {
    title:
      "تمام اطلاعات مالی کسب‌وکار خود را با دقت و شفافیت مدیریت کنید",
    subtitle:
      "با استفاده از ابزارهای یکپارچه مدیریت مالی، فروش، هزینه‌ها و سود کسب‌وکار خود را بررسی کنید و همیشه دید روشنی از وضعیت مالی داشته باشید.",
  },
};
