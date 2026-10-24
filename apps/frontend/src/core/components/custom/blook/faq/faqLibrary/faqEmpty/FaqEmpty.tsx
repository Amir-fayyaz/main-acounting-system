import { FileText } from 'lucide-react';
import { Button } from '@/shadcn/button/button';

export interface FaqEmptyProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onReset?: () => void;
}

function FaqEmpty({
  title = 'پاسخی با این عبارت پیدا نشد.',
  description = 'عبارت کوتاه‌تری جست‌وجو کنید یا همه پرسش‌ها را ببینید.',
  actionLabel = 'نمایش همه پرسش‌ها',
  onReset,
}: FaqEmptyProps) {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-sand-soft px-[25px] py-[37px] text-center">
      <FileText className="size-[29px] text-muted-foreground" />

      <h2 className="my-[13px] text-[20px] leading-[1.7]">{title}</h2>
      <p className="text-[12px] leading-[2] text-muted-foreground">{description}</p>

      <Button
        className="mt-4 min-h-10 text-[11px]"
        type="button"
        variant="outline"
        onClick={onReset}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export default FaqEmpty;
