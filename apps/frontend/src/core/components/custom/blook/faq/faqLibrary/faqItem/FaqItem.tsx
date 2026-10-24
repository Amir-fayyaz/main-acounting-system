import { cn } from '@repo/web/ui/utils/cn';
import { Plus } from 'lucide-react';
import type { FaqEntry } from '../faqData';

export interface FaqItemProps {
  entry: FaqEntry;
  categoryLabel?: string;
  className?: string;
}

function FaqItem({ entry, categoryLabel, className }: FaqItemProps) {
  return (
    <details className={cn('group border-b border-border py-5', className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-[18px] text-[14px] leading-[2] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 pe-[5px]">
          {categoryLabel && (
            <span className="mb-1.5 block text-[9px] text-brand-link">{categoryLabel}</span>
          )}
          {entry.question}
        </span>

        <Plus className="mx-1 size-[17px] shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
      </summary>

      <p className="mt-[13px] max-w-[790px] text-[12px] leading-[2.2] text-muted-foreground">
        {entry.answer}
      </p>
    </details>
  );
}

export default FaqItem;
