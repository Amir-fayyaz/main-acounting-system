import type { BillingPeriod } from '@/core/features/landing/assets/@types/pricing';
import { Badge, Button, Span } from '@repo/web/ui';

import { cn } from '@repo/web/ui/utils/cn';

const periods: readonly { value: BillingPeriod; label: string }[] = [
  { value: 'month', label: 'ماهانه' },
  { value: 'year', label: 'سالانه' },
];

export function BillingToggle({
  period,
  onPeriodChange,
}: {
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
}) {
  return (
    <div className="mb-8 flex items-center justify-center gap-3 max-sm:mb-6 max-sm:gap-2">
      <div
        role="group"
        aria-label="دوره پرداخت"
        className="flex gap-1 rounded-full border border-[#dfd6c5] bg-[#eeeadf] p-1"
      >
        {periods.map((item) => {
          const selected = period === item.value;

          return (
            <Button
              key={item.value}
              type="button"
              variant="ghost"
              aria-pressed={selected}
              onClick={() => onPeriodChange(item.value)}
              className={cn(
                'h-auto min-h-0 rounded-3xl bg-transparent px-5 py-1.5 text-xs leading-relaxed font-normal tracking-normal text-[#706147] shadow-none hover:scale-100 hover:bg-transparent hover:text-[#706147] active:scale-100 max-sm:px-4',
                selected &&
                  'bg-[#fffdf6] font-semibold text-foreground shadow-[0_1px_5px_#5b39140c] hover:bg-[#fffdf6] hover:text-foreground',
              )}
            >
              <Span className="text-[length:inherit]">{item.label}</Span>
            </Button>
          );
        })}
      </div>

      <Badge
        variant="outline"
        className="rounded-sm border-0 bg-[#fff1d9] px-2 py-0.5 text-xs leading-relaxed font-normal text-[#76501c] max-sm:px-1.5"
      >
        <Span className="text-[length:inherit]">۲۰٪ تخفیف سالانه نمونه</Span>
      </Badge>
    </div>
  );
}
