import { cn } from '@/core/utils/shadcn/utils';
import type { FaqCategory, FaqCategoryId } from '../faqData';

export interface FaqFiltersProps {
  categories?: FaqCategory[];
  active?: FaqCategoryId;
  onSelect?: (id: FaqCategoryId) => void;
  className?: string;
}

function FaqFilters({
  categories,
  active = 'all',
  onSelect,
  className,
}: FaqFiltersProps) {
  return (
    <div
      aria-label="دسته پرسش‌ها"
      className={cn('mt-[19px] flex flex-wrap justify-center gap-2', className)}
      role="group"
    >
      {categories?.map((category) => {
        const isActive = category.id === active;

        return (
          <button
            aria-pressed={isActive}
            className={cn(
              'min-h-[34px] rounded-[30px] border px-3 py-[5px] text-[11px] transition-colors',
              isActive
                ? 'border-ink bg-ink text-brand-link'
                : 'border-border text-muted-foreground',
            )}
            key={category.id}
            type="button"
            onClick={() => onSelect?.(category.id)}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

export default FaqFilters;
