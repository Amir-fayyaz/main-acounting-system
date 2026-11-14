import { Badge } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { ChequeDirection } from '../../assets/@types/cheque.types';
import { CHEQUE_DIRECTION_LABELS } from '../../lib/checks.config';

const DIRECTION_CLASSES: Record<ChequeDirection, string> = {
  received: 'border-secondary bg-secondary text-secondary-foreground',
  issued: 'border-primary/30 bg-accent text-accent-foreground',
};

interface ChequeDirectionBadgeProps {
  direction: ChequeDirection;
  className?: string;
}

export function ChequeDirectionBadge({ direction, className }: ChequeDirectionBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        DIRECTION_CLASSES[direction],
        className,
      )}
    >
      {CHEQUE_DIRECTION_LABELS[direction]}
    </Badge>
  );
}
