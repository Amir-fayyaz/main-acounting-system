
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthField } from "./AuthField";

const meta = {
  title: "Auth/AuthField",
  component: AuthField,
  tags: ["autodocs"],
  args: {
    name: "email",
    label: "ایمیل",
    placeholder: "example@email.com",
    type: "email",
    autoComplete: "email",
  },
  argTypes: {
    name: {
      control: "text",
      description: "نام فیلد فرم",
    },
    label: {
      control: "text",
      description: "عنوان فیلد",
    },
    error: {
      control: "text",
      description: "پیام خطا",
    },
    type: {
      control: "select",
      options: ["text", "email", "password", "tel"],
      description: "نوع ورودی",
    },
    ltr: {
      control: "boolean",
      description: "تنظیم جهت نوشتار از چپ به راست",
    },
    required: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof AuthField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: "لطفاً یک ایمیل معتبر وارد کنید.",
  },
};

export const Password: Story = {
  args: {
    name: "password",
    label: "رمز عبور",
    placeholder: "رمز عبور خود را وارد کنید",
    type: "password",
    autoComplete: "current-password",
  },
};

export const LTR: Story = {
  args: {
    name: "mobile",
    label: "شماره موبایل",
    placeholder: "09123456789",
    type: "tel",
    ltr: true,
    autoComplete: "tel",
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const PasswordWithError: Story = {
  args: {
    name: "password",
    label: "رمز عبور",
    type: "password",
    error: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
  },
};
