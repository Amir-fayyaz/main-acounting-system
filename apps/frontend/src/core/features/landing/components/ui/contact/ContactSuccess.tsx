import { Check } from 'lucide-react';
import { Button } from '@/shadcn/button/button';

interface ContactSuccessProps {
  name: string;
  onReset: () => void;
}

export function ContactSuccess({ name, onReset }: ContactSuccessProps) {
  return (
    <div className="py-[14px]">
      <span className="mb-[19px] inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Check className="size-[23px]" />
      </span>
      <h2
        className="mb-3 text-[25px] leading-[1.8] outline-none"
        id="contact-success-title"
        tabIndex={-1}
      >
        پیام نمونه آماده شد.
      </h2>
      <p className="mb-[19px] mt-[10px] text-[12px] leading-[2.1] text-muted-foreground">
        <strong className="font-semibold">{name}</strong>، فرم شما بررسی شد. این یک پیش‌نمایش محلی
        است و پیام واقعاً ارسال نشده است.
      </p>
      <Button
        className="min-h-12 rounded-lg border-border! px-6 text-[12px] text-ink! hover:bg-white!"
        type="button"
        variant="outline"
        onClick={onReset}
      >
        نوشتن پیام جدید
      </Button>
    </div>
  );
}
