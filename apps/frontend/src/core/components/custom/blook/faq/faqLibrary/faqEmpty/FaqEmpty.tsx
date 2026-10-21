import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
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
    <div className="rounded-[12px] border border-dashed border-faq-empty-border bg-faq-empty-bg px-[25px] py-[37px] text-center">
      <TarazIcon className="size-[29px] text-faq-empty-icon" name="file" />

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
