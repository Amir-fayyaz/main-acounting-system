import type { Currency, PeriodStatus } from '../assets/@types/settings';

export const CURRENCY_OPTIONS: ReadonlyArray<{ value: Currency; label: string }> = [
  { value: 'IRR', label: 'ریال (IRR)' },
  { value: 'TOMAN', label: 'تومان' },
];

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  open: 'باز',
  closed: 'بسته',
  'no-period': 'بدون دوره',
};

export const PERIOD_STATUS_VARIANT: Record<PeriodStatus, 'success' | 'secondary'> = {
  open: 'success',
  closed: 'secondary',
  'no-period': 'secondary',
};
