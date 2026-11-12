import { Badge } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { ChequeStatus } from '../../assets/@types/cheque.types';
import { CHEQUE_STATUS_LABELS } from '../../lib/checks.config';

const STATUS_CLASSES: Record<ChequeStatus, string> = {
  pending: 'border-border bg-muted text-muted-foreground',
  'due-soon': 'border-primary/30 bg-accent text-accent-foreground',
  cleared: 'border-secondary bg-secondary text-secondary-foreground',
  returned: 'border-destructive/30 bg-destructive/10 text-destructive',
  overdue: 'border-destructive/40 bg-destructive/15 text-destructive',
  assigned: 'border-primary/40 bg-primary/15 text-foreground',
};

interface ChequeStatusBadgeProps {
  status: ChequeStatus;
  className?: string;
}

export function ChequeStatusBadge({ status, className }: ChequeStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {CHEQUE_STATUS_LABELS[status]}
    </Badge>
  );
}
