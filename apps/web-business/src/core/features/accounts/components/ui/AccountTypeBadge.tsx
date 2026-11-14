import { Badge } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { AccountType } from '../../assets/@types/account.types';
import { ACCOUNT_TYPE_LABELS } from '../../lib/accounts.config';

const TYPE_CLASSES: Record<AccountType, string> = {
  bank: 'border-primary/30 bg-accent text-accent-foreground',
  cash: 'border-secondary bg-secondary text-secondary-foreground',
  'petty-cash': 'border-border bg-muted text-muted-foreground',
};

interface AccountTypeBadgeProps {
  type: AccountType;
  className?: string;
}

export function AccountTypeBadge({ type, className }: AccountTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        TYPE_CLASSES[type],
        className,
      )}
    >
      {ACCOUNT_TYPE_LABELS[type]}
    </Badge>
  );
}
