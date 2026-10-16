"use client";
import { Input } from "@/core/components/shadcn/ui/input/input";
import { cn } from "@/core/utils/shadcn/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("ps-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
        aria-pressed={visible}
        className="text-muted-foreground hover:bg-muted absolute start-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
