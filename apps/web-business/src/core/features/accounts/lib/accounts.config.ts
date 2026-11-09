import type { AccountStatus, AccountType } from '../assets/@types/account.types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: 'بانک',
  cash: 'صندوق',
  'petty-cash': 'تنخواه',
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
};

export interface AccountSelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

export const ACCOUNT_TYPE_OPTIONS: readonly AccountSelectOption<AccountType>[] = (
  Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]
).map(([value, label]) => ({ value, label }));

/** اندازه‌های صفحه مطابق طراحی accounts.html. */
export const ACCOUNT_PAGE_SIZES = [10, 20, 50] as const;

export const ACCOUNT_BANKS = ['ملی', 'ملت', 'سامان', 'پاسارگاد', 'صادرات'] as const;

/** شماره شبا: IR و دقیقاً ۲۴ رقم. */
export const ACCOUNT_IBAN_PATTERN = /^IR\d{24}$/;
