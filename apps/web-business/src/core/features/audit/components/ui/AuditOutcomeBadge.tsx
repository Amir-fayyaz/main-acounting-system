'use client';

import { Badge } from '@repo/web';

import type { AuditOutcome } from '../../assets/@types/audit';

const VARIANT: Record<AuditOutcome, 'success' | 'destructive'> = {
  'موفق': 'success',
  'ناموفق': 'destructive',
};

export type AuditOutcomeBadgeProps = {
  outcome: AuditOutcome;
};

export function AuditOutcomeBadge({ outcome }: AuditOutcomeBadgeProps) {
  return <Badge variant={VARIANT[outcome]}>{outcome}</Badge>;
}
