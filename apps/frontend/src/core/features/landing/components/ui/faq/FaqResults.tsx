import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/shadcn/button/button';
import type { FaqCategoryId, FaqEntry } from '@/core/features/landing/assets/@types/faq';

interface FaqResultsProps {
  entries: FaqEntry[];
  labelOf: (_id: FaqCategoryId) => string;
  onReset: () => void;
}

export function FaqResults({ entries, labelOf, onReset }: FaqResultsProps) {
  return (
    <div aria-label="پرسش‌ها و پاسخ‌ها" className="mx-auto max-w-240 pb-9">
      <P aria-live="polite" className="mb-3.5 text-xs text-muted-foreground" role="status">
        {new Intl.NumberFormat('fa-IR').format(entries.length)} پاسخ برای شما
      </P>

      {entries.map((entry) => (
        <details className="group border-b border-border py-5" key={entry.id}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm leading-loose font-semibold [&::-webkit-details-marker]:hidden">
            <Span className="text-[length:inherit] min-w-0 pe-1">
              <Span className="mb-1.5 block text-xs text-brand-link">
                {labelOf(entry.category)}
              </Span>
              {entry.question}
            </Span>
            <Plus className="mx-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
          </summary>
          <P className="mt-3 max-w-200 text-xs leading-loose text-muted-foreground">
            {entry.answer}
          </P>
        </details>
      ))}

      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-sand-soft px-6 py-9 text-center">
          <FileText className="mx-auto size-7 text-muted-foreground" />
          <H2 className="my-3 text-xl leading-relaxed">پاسخی با این عبارت پیدا نشد.</H2>
          <P className="text-xs leading-loose text-muted-foreground">
            عبارت کوتاه‌تری جست‌وجو کنید یا همه پرسش‌ها را ببینید.
          </P>
          <Button
            className="mt-4 min-h-10 text-xs"
            type="button"
            variant="outline"
            onClick={onReset}
          >
            <Span className="text-[length:inherit]">نمایش همه پرسش‌ها</Span>
          </Button>
        </div>
      )}
    </div>
  );
}
