'use client';

import { Badge } from '@repo/web';

import type { SaleStatus } from '../../assets/@types/sale';

const VARIANT: Record<SaleStatus, 'success' | 'secondary' | 'destructive'> = {
  'تسویه‌شده': 'success',
  'پرداخت جزئی': 'secondary',
  'تسویه‌نشده': 'destructive',
};

export type SaleStatusBadgeProps = {
  status: SaleStatus;
};

export function SaleStatusBadge({ status }: SaleStatusBadgeProps) {
  return <Badge variant={VARIANT[status]}>{status}</Badge>;
}
