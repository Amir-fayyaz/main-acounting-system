import { Badge } from '@repo/web';
import type { JournalStatus } from '../../assets/@types';

export interface JournalStatusBadgeProps {
  status: JournalStatus;
  className?: string;
}

export function JournalStatusBadge({ status, className }: JournalStatusBadgeProps) {
  if (status === 'draft') {
    return (
      <Badge variant="outline" className={className}>
        پیش‌نویس
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      تراز
    </Badge>
  );
}
