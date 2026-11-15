import { Badge } from '@repo/web';

import type { UserStatus } from '../../assets/@types/user';

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
};

const STATUS_TONE: Record<UserStatus, 'default' | 'secondary'> = {
  active: 'default',
  inactive: 'secondary',
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={STATUS_TONE[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}
