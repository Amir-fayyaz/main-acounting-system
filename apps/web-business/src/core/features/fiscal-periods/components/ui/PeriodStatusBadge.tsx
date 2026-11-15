import { CiLock } from 'react-icons/ci';
import { Badge } from '@repo/web';

import type { FiscalPeriodStatus } from '../../assets/@types';
import { getPeriodStatusLabel } from '../../utils/fiscal-date';

export interface PeriodStatusBadgeProps {
  status: FiscalPeriodStatus;
  className?: string;
}

export function PeriodStatusBadge({ status, className }: PeriodStatusBadgeProps) {
  const label = getPeriodStatusLabel(status);

  if (status === 'closed') {
    return (
      <Badge
        variant="outline"
        className={`gap-1 bg-muted/60 text-muted-foreground ${className ?? ''}`}
      >
        <CiLock className="size-3.5" />
        {label}
      </Badge>
    );
  }

  if (status === 'review' || status === 'closing') {
    return (
      <Badge
        variant="outline"
        className={`border-primary/40 bg-primary/10 text-primary ${className ?? ''}`}
      >
        {label}
      </Badge>
    );
  }

  if (status === 'reopened') {
    return (
      <Badge variant="secondary" className={className}>
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="success" className={className}>
      {label}
    </Badge>
  );
}
