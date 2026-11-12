/** Currency contract for account balances. Money is always a canonical string. */
export const ACCOUNT_CURRENCY = 'IRR' as const;

export type AccountCurrency = typeof ACCOUNT_CURRENCY;

/** نوع حساب: بانک، صندوق یا تنخواه. */
export const ACCOUNT_TYPES = ['bank', 'cash', 'petty-cash'] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = ['active', 'inactive'] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function isAccountType(value: string): value is AccountType {
  return (ACCOUNT_TYPES as readonly string[]).includes(value);
}

export function isAccountStatus(value: string): value is AccountStatus {
  return (ACCOUNT_STATUSES as readonly string[]).includes(value);
}

/** قرارداد پول در پاسخ API: مبلغ رشته‌ی canonical با دو رقم اعشار و ارز IRR. */
export interface MoneyDto {
  amount: string;
  currency: AccountCurrency;
}

/** DTO حساب مطابق قرارداد API. */
export interface AccountDto {
  id: string;
  revision: number;
  title: string;
  type: AccountType;
  /** فقط برای حساب بانکی مقدار دارد. */
  bank: string | null;
  /** شماره شبا؛ فقط برای حساب بانکی مقدار دارد. */
  iban: string | null;
  branch: string | null;
  balance: MoneyDto;
  status: AccountStatus;
}

/** مدل آماده‌ی نمایش؛ همه‌ی مبالغ canonical هستند. */
export interface Account {
  id: string;
  revision: number;
  title: string;
  type: AccountType;
  bank: string | null;
  iban: string | null;
  branch: string | null;
  balance: MoneyDto;
  status: AccountStatus;
}

export interface AccountListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: AccountType;
}

export type AccountStatsParams = Omit<AccountListParams, 'page' | 'limit'>;

export interface AccountStats {
  /** جمع موجودی همه‌ی حساب‌های بانکی. */
  bankBalance: MoneyDto;
  /** جمع موجودی صندوق‌ها و تنخواه‌ها. */
  cashBalance: MoneyDto;
  /** تعداد حساب‌های مجموعه‌ی فیلترشده. */
  total: number;
}

export interface CreateAccountRequest {
  title: string;
  type: AccountType;
  bank: string | null;
  iban: string | null;
  /** موجودی اولیه؛ فقط هنگام ایجاد حساب ارسال می‌شود. */
  openingBalance: MoneyDto;
}

export interface AccountFormValues {
  title: string;
  type: AccountType;
  bank: string;
  iban: string;
  openingBalance: string;
}

export type AccountFormErrors = Partial<Record<keyof AccountFormValues, string>>;

/** کلیدهای خطای فیلد که API می‌تواند برگرداند. */
export type AccountFieldErrors = AccountFormErrors;
