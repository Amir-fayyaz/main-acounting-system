import { Search, X } from 'lucide-react';
import { cn } from '@/core/utils/shadcn/utils';
import type { FaqCategory, FaqCategoryId } from '@/core/features/landing/assets/@types/faq';

interface FaqControlsProps {
  query: string;
  activeCategory: FaqCategoryId;
  categories: FaqCategory[];
  // eslint-disable-next-line no-unused-vars
  onQueryChange: (_value: string) => void;
  // eslint-disable-next-line no-unused-vars
  onCategoryChange: (_id: FaqCategoryId) => void;
}

export function FaqControls({
  query,
  activeCategory,
  categories,
  onQueryChange,
  onCategoryChange,
}: FaqControlsProps) {
  return (
    <div className="mx-auto mb-7 max-w-[780px]">
      <div className="flex items-center gap-2.5 rounded-[9px] border border-border bg-card px-[15px] focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2">
        <Search className="size-[18px] text-muted-foreground" />
        <input
          aria-label="جست‌وجو در پرسش‌های متداول"
          className="min-w-0 flex-1 bg-transparent py-[14px] text-[13px] text-ink outline-none placeholder:text-muted-foreground"
          placeholder="مثلاً ثبت سند، تعرفه یا ورود…"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query && (
          <button
            aria-label="پاک کردن جست‌وجو"
            className="grid size-[25px] shrink-0 place-items-center rounded-full bg-muted p-0"
            type="button"
            onClick={() => onQueryChange('')}
          >
            <X className="size-[13px]" />
          </button>
        )}
      </div>

      <div
        aria-label="دسته پرسش‌ها"
        className="mt-[19px] flex flex-wrap justify-center gap-2"
        role="group"
      >
        {categories.map((category) => {
          const isActive = category.id === activeCategory;
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
              onClick={() => onCategoryChange(category.id)}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
