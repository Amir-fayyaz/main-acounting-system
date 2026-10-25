import { Span } from '@/core/components/custom/ui/typography/Typography';
import { Search, X } from 'lucide-react';
import { cn } from '@/core/utils/shadcn/utils';
import type { FaqCategory, FaqCategoryId } from '@/core/features/landing/assets/@types/faq';

interface FaqControlsProps {
  query: string;
  activeCategory: FaqCategoryId;
  categories: FaqCategory[];
  onQueryChange: (_value: string) => void;
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
    <div className="mx-auto mb-7 max-w-200">
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          aria-label="جست‌وجو در پرسش‌های متداول"
          className="min-w-0 flex-1 bg-transparent py-3.5 text-xs text-ink outline-none placeholder:text-muted-foreground"
          placeholder="مثلاً ثبت سند، تعرفه یا ورود…"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query && (
          <button
            aria-label="پاک کردن جست‌وجو"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-muted p-0"
            type="button"
            onClick={() => onQueryChange('')}
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      <div
        aria-label="دسته پرسش‌ها"
        className="mt-5 flex flex-wrap justify-center gap-2"
        role="group"
      >
        {categories.map((category) => {
          const isActive = category.id === activeCategory;
          return (
            <button
              aria-pressed={isActive}
              className={cn(
                'min-h-8 rounded-full border px-3 py-1 text-xs transition-colors',
                isActive
                  ? 'border-ink bg-ink text-brand-link'
                  : 'border-border text-muted-foreground',
              )}
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
            >
              <Span className="text-[length:inherit]">{category.label}</Span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
