import type { BillingPeriod } from '@/core/features/pricing/assets/@types/pricing';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Button } from '@/core/components/shadcn/ui/button/button';
import { cn } from '@/core/utils/shadcn/utils';

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
    <div className="mb-[31px] flex items-center justify-center gap-3 max-[600px]:mb-[25px] max-[600px]:gap-[9px]">
      <div
        role="group"
        aria-label="دوره پرداخت"
        className="flex gap-1 rounded-[30px] border border-[#dfd6c5] bg-[#eeeadf] p-1"
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
                'h-auto min-h-0 rounded-[25px] bg-transparent px-[19px] py-[7px] text-xs leading-[1.8] font-normal tracking-normal text-[#706147] shadow-none hover:scale-100 hover:bg-transparent hover:text-[#706147] active:scale-100 max-[600px]:px-4 max-[600px]:text-[11px]',
                selected &&
                  'bg-[#fffdf6] font-[650] text-[#1a120a] shadow-[0_1px_5px_#5b39140c] hover:bg-[#fffdf6] hover:text-[#1a120a]',
              )}
            >
              {item.label}
            </Button>
          );
        })}
      </div>

      <Badge
        variant="outline"
        className="rounded-[5px] border-0 bg-[#fff1d9] px-2 py-[3px] text-[10px] leading-[1.8] font-normal text-[#76501c] max-[600px]:px-1.5 max-[600px]:text-[9px]"
      >
        ۲۰٪ تخفیف سالانه نمونه
      </Badge>
    </div>
  );
}
