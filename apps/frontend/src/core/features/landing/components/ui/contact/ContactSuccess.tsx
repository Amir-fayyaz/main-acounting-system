import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { Check } from 'lucide-react';
import { Button } from '@/shadcn/button/button';

interface ContactSuccessProps {
  name: string;
  onReset: () => void;
}

export function ContactSuccess({ name, onReset }: ContactSuccessProps) {
  return (
    <div className="py-3.5">
      <Span className="text-[length:inherit] mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Check className="size-6" />
      </Span>
      <H2
        className="mb-3 text-2xl leading-relaxed outline-none"
        id="contact-success-title"
        tabIndex={-1}
      >
        پیام نمونه آماده شد.
      </H2>
      <P className="mb-5 mt-2.5 text-xs leading-loose text-muted-foreground">
        <strong className="font-semibold">
          <Span className="text-[length:inherit]">{name}</Span>
        </strong>
        ، فرم شما بررسی شد. این یک پیش‌نمایش محلی است و پیام واقعاً ارسال نشده است.
      </P>
      <Button
        className="min-h-12 rounded-lg border-border! px-6 text-xs text-ink! hover:bg-white!"
        type="button"
        variant="outline"
        onClick={onReset}
      >
        <Span className="text-[length:inherit]">نوشتن پیام جدید</Span>
      </Button>
    </div>
  );
}
