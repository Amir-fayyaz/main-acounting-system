import { Input } from "@/core/components/shadcn/ui/input/input";
import { InputErrorMassage } from "@/core/components/custom/ui/typography/Typography";
import { cn } from "@/core/utils/shadcn/utils";
import type { ComponentProps } from "react";
import { PasswordInput } from "./PasswordInput";

export const authInputClass =
  "bg-card border-input h-12 rounded-xl px-4 text-base shadow-none md:text-base";

type AuthFieldProps = Omit<ComponentProps<"input">, "name"> & {
  name: string;
  label: string;
  error?: string;
  /** برای ایمیل/موبایل: چیدمان چپ‌به‌راست */
  ltr?: boolean;
  wrapperClassName?: string;
};

/** label + input + پیام خطا (مطابق `.field` در auth.html) */
export function AuthField({
  name,
  label,
  error,
  ltr,
  type = "text",
  className,
  wrapperClassName,
  ...props
}: AuthFieldProps) {
  const id = props.id ?? name;
  const common = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
    ...props,
  };
  const cls = cn(authInputClass, ltr && "text-right [direction:ltr]", className);

  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {type === "password" ? (
        <PasswordInput {...common} className={cls} />
      ) : (
        <Input {...common} type={type} className={cls} />
      )}
      <InputErrorMassage id={`${id}-error`} role="alert">
        {error}
      </InputErrorMassage>
    </div>
  );
}
