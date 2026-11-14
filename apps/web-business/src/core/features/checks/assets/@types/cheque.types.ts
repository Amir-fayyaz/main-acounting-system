/** Currency contract for cheque amounts. Money is always a canonical string. */
export const CHEQUE_CURRENCY = 'IRR' as const;

export type ChequeCurrency = typeof CHEQUE_CURRENCY;

/** جهت چک: دریافتی یا پرداختی. */
export const CHEQUE_DIRECTIONS = ['received', 'issued'] as const;

export type ChequeDirection = (typeof CHEQUE_DIRECTIONS)[number];

/** وضعیت‌های چک؛ متن فارسی آن‌ها در `checks.config.ts` نگهداری می‌شود. */
export const CHEQUE_STATUSES = [
  'pending',
  'due-soon',
  'cleared',
  'returned',
  'overdue',
  'assigned',
] as const;

export type ChequeStatus = (typeof CHEQUE_STATUSES)[number];

export function isChequeDirection(value: string): value is ChequeDirection {
  return (CHEQUE_DIRECTIONS as readonly string[]).includes(value);
}

export function isChequeStatus(value: string): value is ChequeStatus {
  return (CHEQUE_STATUSES as readonly string[]).includes(value);
}

/** قرارداد پول در پاسخ API: مبلغ رشته‌ی canonical با دو رقم اعشار و ارز IRR. */
export interface MoneyDto {
  amount: string;
  currency: ChequeCurrency;
}

/** DTO چک مطابق قرارداد API. */
export interface ChequeDto {
  id: string;
  revision: number;
  number: string;
  sayadId: string;
  direction: ChequeDirection;
  counterparty: string;
  bank: string;
  amount: MoneyDto;
  /** تاریخ ثبت به شکل جلالی canonical، مثل `1405/07/27`. */
  registeredDate: string;
  /** تاریخ سررسید به شکل جلالی canonical، مثل `1405/08/10`. */
  dueDate: string;
  status: ChequeStatus;
}

/** مدل آماده‌ی نمایش؛ همه‌ی مبالغ و تاریخ‌ها canonical هستند. */
export interface Cheque {
  id: string;
  revision: number;
  number: string;
  sayadId: string;
  direction: ChequeDirection;
  counterparty: string;
  bank: string;
  amount: MoneyDto;
  registeredDate: string;
  dueDate: string;
  status: ChequeStatus;
}

/** قواعد فرم که مرجع آن API است، نه کلاینت. */
export interface ChequeFormRules {
  sayad: {
    length: number;
    pattern: string;
  };
  chequeNumber: {
    minLength: number;
    maxLength: number;
    pattern: string;
  };
  /** دامنه‌ی یکتایی شماره چک؛ قانون نهایی سمت سرور اعمال می‌شود. */
  duplicateNumberScope: 'bank' | 'global';
}

export interface ChequeListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ChequeStatus;
  direction?: ChequeDirection;
}

export type ChequeStatsParams = Omit<ChequeListParams, 'page' | 'limit'>;

export interface ChequeStats {
  total: number;
  received: number;
  issued: number;
  overdue: number;
}

export interface CreateChequeRequest {
  number: string;
  sayadId: string;
  direction: ChequeDirection;
  counterparty: string;
  bank: string;
  amount: MoneyDto;
  registeredDate: string;
  dueDate: string;
}

export interface UpdateChequeRequest extends CreateChequeRequest {
  id: string;
  expectedRevision: number;
}

export interface ChequeConflictQuery {
  number: string;
  bank: string;
  sayadId: string;
  excludeId?: string;
}

export interface ChequeConflict {
  number: Cheque | null;
  sayadId: Cheque | null;
}

export interface ChequeFormValues {
  number: string;
  sayadId: string;
  direction: ChequeDirection;
  counterparty: string;
  bank: string;
  amount: string;
  registeredDate: string;
  dueDate: string;
}

export type ChequeFormErrors = Partial<Record<keyof ChequeFormValues, string>>;

/** کلیدهای خطای فیلد که API می‌تواند برگرداند. */
export type ChequeFieldErrors = ChequeFormErrors;
