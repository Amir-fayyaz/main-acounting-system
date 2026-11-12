import { Badge } from '@repo/web';

import type { PurchaseStatus } from '../../assets/@types/purchase';

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  'پرداخت‌شده': 'پرداخت‌شده',
  'تسویه‌نشده': 'تسویه‌نشده',
  'پرداخت جزئی': 'پرداخت جزئی',
};

export const PURCHASE_STATUS_OPTIONS: { value: PurchaseStatus; label: string }[] = [
  { value: 'پرداخت‌شده', label: 'پرداخت‌شده' },
  { value: 'تسویه‌نشده', label: 'تسویه‌نشده' },
  { value: 'پرداخت جزئی', label: 'پرداخت جزئی' },
];

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const tone =
    status === 'پرداخت‌شده'
      ? 'success'
      : status === 'پرداخت جزئی'
        ? 'secondary'
        : 'destructive';
  return <Badge variant={tone}>{PURCHASE_STATUS_LABELS[status]}</Badge>;
}
