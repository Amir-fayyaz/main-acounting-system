import type { ChequeDirection, ChequeStatus } from '../assets/@types/cheque.types';

export const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  pending: 'در انتظار',
  'due-soon': 'نزدیک سررسید',
  cleared: 'وصول‌شده',
  returned: 'برگشتی',
  overdue: 'سررسیدشده',
  assigned: 'واگذارشده',
};

export const CHEQUE_DIRECTION_LABELS: Record<ChequeDirection, string> = {
  received: 'دریافتی',
  issued: 'پرداختی',
};

export interface ChequeSelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

export const CHEQUE_STATUS_OPTIONS: readonly ChequeSelectOption<ChequeStatus>[] = (
  Object.entries(CHEQUE_STATUS_LABELS) as [ChequeStatus, string][]
).map(([value, label]) => ({ value, label }));

export const CHEQUE_DIRECTION_OPTIONS: readonly ChequeSelectOption<ChequeDirection>[] = (
  Object.entries(CHEQUE_DIRECTION_LABELS) as [ChequeDirection, string][]
).map(([value, label]) => ({ value, label }));

/** اندازه‌های صفحه مطابق طراحی cheques.html. */
export const CHEQUE_PAGE_SIZES = [10, 20, 50] as const;

export const CHEQUE_BANKS = ['ملی', 'ملت', 'سامان', 'پاسارگاد', 'صادرات'] as const;

export const CHEQUE_NUMBER_MAX_LENGTH = 12;
