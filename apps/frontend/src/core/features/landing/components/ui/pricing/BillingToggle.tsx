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
        className="flex gap-1 rounded-full border border-border bg-sand p-1"
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
                'h-auto min-h-0 rounded-3xl bg-transparent px-5 py-1.5 text-xs leading-relaxed font-normal tracking-normal text-muted-foreground shadow-none hover:scale-100 hover:bg-transparent hover:text-muted-foreground active:scale-100 max-sm:px-4',
                selected &&
                  'bg-card font-semibold text-foreground shadow-[0_1px_5px_color-mix(in_srgb,var(--foreground)_5%,transparent)] hover:bg-card hover:text-foreground',
              )}
            >
              <Span className="text-[length:inherit]">{item.label}</Span>
            </Button>
          );
        })}
      </div>

      <Badge
        variant="outline"
        className="rounded-sm border-0 bg-accent px-2 py-0.5 text-xs leading-relaxed font-normal text-muted-foreground max-sm:px-1.5"
      >
        <Span className="text-[length:inherit]">۲۰٪ تخفیف سالانه نمونه</Span>
      </Badge>
    </div>
  );
}
