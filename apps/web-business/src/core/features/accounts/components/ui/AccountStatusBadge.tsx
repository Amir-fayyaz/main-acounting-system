import { Badge } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { AccountStatus } from '../../assets/@types/account.types';
import { ACCOUNT_STATUS_LABELS } from '../../lib/accounts.config';

const STATUS_CLASSES: Record<AccountStatus, string> = {
  active: 'border-secondary bg-secondary text-secondary-foreground',
  inactive: 'border-border bg-muted text-muted-foreground',
};

interface AccountStatusBadgeProps {
  status: AccountStatus;
  className?: string;
}

export function AccountStatusBadge({ status, className }: AccountStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_CLASSES[status],
        className,
      )}
    >
      {ACCOUNT_STATUS_LABELS[status]}
    </Badge>
  );
}
