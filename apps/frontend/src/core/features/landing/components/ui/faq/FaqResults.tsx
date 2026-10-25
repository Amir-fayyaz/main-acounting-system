import { FileText, Plus } from 'lucide-react';
import { Button } from '@/shadcn/button/button';
import type { FaqCategoryId, FaqEntry } from '@/core/features/landing/assets/@types/faq';

interface FaqResultsProps {
  entries: FaqEntry[];
  // eslint-disable-next-line no-unused-vars
  labelOf: (_id: FaqCategoryId) => string;
  onReset: () => void;
}

export function FaqResults({ entries, labelOf, onReset }: FaqResultsProps) {
  return (
    <section aria-label="پرسش‌ها و پاسخ‌ها" className="mx-auto max-w-[900px] pb-[38px]">
      <p aria-live="polite" className="mb-[15px] text-[10px] text-muted-foreground" role="status">
        {new Intl.NumberFormat('fa-IR').format(entries.length)} پاسخ برای شما
      </p>

      {entries.map((entry) => (
        <details className="group border-b border-border py-5" key={entry.id}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-[18px] text-[14px] leading-[2] font-semibold [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 pe-[5px]">
              <span className="mb-1.5 block text-[9px] text-brand-link">
                {labelOf(entry.category)}
              </span>
              {entry.question}
            </span>
            <Plus className="mx-1 size-[17px] shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
          </summary>
          <p className="mt-[13px] max-w-[790px] text-[12px] leading-[2.2] text-muted-foreground">
            {entry.answer}
          </p>
        </details>
      ))}

      {entries.length === 0 && (
        <div className="rounded-[12px] border border-dashed border-border bg-sand-soft px-[25px] py-[37px] text-center">
          <FileText className="mx-auto size-[29px] text-muted-foreground" />
          <h2 className="my-[13px] text-[20px] leading-[1.7]">پاسخی با این عبارت پیدا نشد.</h2>
          <p className="text-[12px] leading-[2] text-muted-foreground">
            عبارت کوتاه‌تری جست‌وجو کنید یا همه پرسش‌ها را ببینید.
          </p>
          <Button
            className="mt-4 min-h-10 text-[11px]"
            type="button"
            variant="outline"
            onClick={onReset}
          >
            نمایش همه پرسش‌ها
          </Button>
        </div>
      )}
    </section>
  );
}
