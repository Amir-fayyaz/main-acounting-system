import { Badge } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { PosStatus } from '../../assets/@types/pos-terminal.types';
import { POS_STATUS_LABELS } from '../../lib/pos.config';

const STATUS_CLASSES: Record<PosStatus, string> = {
  active: 'border-secondary bg-secondary text-secondary-foreground',
  inactive: 'border-border bg-muted text-muted-foreground',
};

interface PosStatusBadgeProps {
  status: PosStatus;
  className?: string;
}

export function PosStatusBadge({ status, className }: PosStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {POS_STATUS_LABELS[status]}
    </Badge>
  );
}
