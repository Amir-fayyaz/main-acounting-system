import { Badge } from '@repo/web';

import type { BranchStatus } from '../../assets/@types/branch';

/** Persian labels for branch statuses (single source for badge and filter). */
export const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
};

/** Filter options rendered by the branches toolbar. */
export const BRANCH_STATUS_OPTIONS: ReadonlyArray<{
  value: BranchStatus;
  label: string;
}> = [
  { value: 'active', label: BRANCH_STATUS_LABELS.active },
  { value: 'inactive', label: BRANCH_STATUS_LABELS.inactive },
];

const STATUS_VARIANT: Record<BranchStatus, 'success' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
};

export type BranchStatusBadgeProps = {
  status: BranchStatus;
};

/** Read-only badge for a branch's active/inactive state. */
export function BranchStatusBadge({ status }: BranchStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="text-xs">
      {BRANCH_STATUS_LABELS[status]}
    </Badge>
  );
}
