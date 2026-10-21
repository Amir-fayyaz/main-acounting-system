import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
import { cn } from '@/core/utils/shadcn/utils';

export interface FaqSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function FaqSearch({
  value,
  onChange,
  placeholder = 'مثلاً ثبت سند، تعرفه یا ورود…',
  className,
}: FaqSearchProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-[9px] border border-faq-search-border bg-faq-search-bg px-[15px]',
        'focus-within:outline-2 focus-within:outline-faq-focus focus-within:outline-offset-2',
        className,
      )}
    >
      <TarazIcon className="size-[18px] text-faq-search-icon" name="search" />

      <input
        aria-label="جست‌وجو در پرسش‌های متداول"
        className="min-w-0 flex-1 bg-transparent py-[14px] text-[13px] text-ink outline-none placeholder:text-faq-search-icon"
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {value && (
        <button
          aria-label="پاک کردن جست‌وجو"
          className="grid size-[25px] shrink-0 place-items-center rounded-full bg-faq-clear p-0"
          type="button"
          onClick={() => onChange('')}
        >
          <TarazIcon className="size-[13px] rotate-45" name="plus" />
        </button>
      )}
    </div>
  );
}

export default FaqSearch;
