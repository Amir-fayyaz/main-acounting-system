import { Badge } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { FiscalPeriodStatus } from '../../assets/@types/fiscal-periods.types';
import { FISCAL_PERIOD_STATUS_META } from '../../lib/fiscal-period.config';

interface FiscalPeriodStatusBadgeProps {
  status: FiscalPeriodStatus;
  className?: string;
}

export function FiscalPeriodStatusBadge({ status, className }: FiscalPeriodStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold sm:text-xs',
        status === 'open' && 'border-transparent bg-secondary text-secondary-foreground',
        status === 'review' && 'border-transparent bg-accent text-primary',
        status === 'closing' && 'border-transparent bg-muted text-muted-foreground',
        status === 'closed' && 'border-transparent bg-muted text-muted-foreground',
        status === 'reopened' && 'border-transparent bg-accent text-primary',
        className,
      )}
    >
      {FISCAL_PERIOD_STATUS_META[status].label}
    </Badge>
  );
}
