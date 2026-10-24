import { cn } from '@repo/web/ui/utils/cn';
import { Search, X } from 'lucide-react';

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
        'flex items-center gap-2.5 rounded-[9px] border border-border bg-card px-[15px]',
        'focus-within:outline-2 focus-within:outline-ring focus-within:outline-offset-2',
        className,
      )}
    >
      <Search className="size-[18px] text-muted-foreground" />

      <input
        aria-label="جست‌وجو در پرسش‌های متداول"
        className="min-w-0 flex-1 bg-transparent py-[14px] text-[13px] text-ink outline-none placeholder:text-muted-foreground"
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {value && (
        <button
          aria-label="پاک کردن جست‌وجو"
          className="grid size-[25px] shrink-0 place-items-center rounded-full bg-muted p-0"
          type="button"
          onClick={() => onChange('')}
        >
          <X className="size-[13px]" />
        </button>
      )}
    </div>
  );
}

export default FaqSearch;
