/** وضعیت ترمینال POS؛ متن فارسی آن در `pos.config.ts` نگهداری می‌شود. */
export const POS_STATUSES = ['active', 'inactive'] as const;

export type PosStatus = (typeof POS_STATUSES)[number];

export function isPosStatus(value: string): value is PosStatus {
  return (POS_STATUSES as readonly string[]).includes(value);
}

/** DTO ترمینال مطابق قرارداد API. */
export interface PosTerminalDto {
  id: string;
  revision: number;
  title: string;
  terminalNumber: string;
  merchantNumber: string | null;
  bank: string | null;
  /** درصد کارمزد به شکل رشته‌ی canonical با دو رقم اعشار، مثل `0.70`. */
  feePercent: string | null;
  settlementIban: string | null;
  /** تاریخ فعال‌سازی به شکل جلالی canonical، مثل `1405/07/27`. */
  activatedOn: string | null;
  status: PosStatus;
}

/** مدل آماده‌ی نمایش؛ درصد کارمزد و تاریخ canonical هستند. */
export interface PosTerminal {
  id: string;
  revision: number;
  title: string;
  terminalNumber: string;
  merchantNumber: string | null;
  bank: string | null;
  feePercent: string | null;
  settlementIban: string | null;
  activatedOn: string | null;
  status: PosStatus;
}

export interface PosTerminalListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PosStatus;
}

export interface CreatePosTerminalRequest {
  title: string;
  terminalNumber: string;
  merchantNumber: string | null;
  bank: string | null;
  feePercent: string | null;
}

export interface PosTerminalFormValues {
  title: string;
  terminalNumber: string;
  merchantNumber: string;
  bank: string;
  feePercent: string;
}

export type PosTerminalFormErrors = Partial<Record<keyof PosTerminalFormValues, string>>;

/** کلیدهای خطای فیلد که API می‌تواند برگرداند. */
export type PosTerminalFieldErrors = PosTerminalFormErrors;
