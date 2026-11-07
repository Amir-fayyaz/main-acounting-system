import type {
  FiscalDemoOption,
  FiscalPeriodAction,
  FiscalPeriodStatus,
} from '../assets/@types/fiscal-periods.types';

interface FiscalPeriodStatusMeta {
  label: string;
  description: string;
}

export const FISCAL_PERIOD_STATUS_META: Record<FiscalPeriodStatus, FiscalPeriodStatusMeta> = {
  open: {
    label: 'باز',
    description: 'ثبت سند، فاکتور، دریافت و پرداخت در این دوره مجاز است.',
  },
  review: {
    label: 'در بازبینی',
    description: 'ثبت جدید در این دوره متوقف شده است.',
  },
  closing: {
    label: 'در حال بستن',
    description: 'عملیات بستن دوره در حال پردازش است.',
  },
  closed: {
    label: 'بسته',
    description: 'ثبت در این دوره انجام نمی‌شود.',
  },
  reopened: {
    label: 'بازگشایی‌شده',
    description: 'برای اصلاح موقت باز شده و ثبت در آن مجاز است.',
  },
};

const POSTABLE_STATUSES: readonly FiscalPeriodStatus[] = ['open', 'reopened'];

/** آیا ثبت سند/فاکتور/دریافت و پرداخت در این وضعیت مجاز است؟ */
export function isPeriodPostable(status: FiscalPeriodStatus): boolean {
  return POSTABLE_STATUSES.includes(status);
}

export const FISCAL_PERIOD_ACTION_LABELS: Record<FiscalPeriodAction, string> = {
  review: 'شروع بازبینی',
  open: 'بازگشت به باز',
  close: 'بستن دوره',
  reopen: 'بازگشایی',
};

/** برچسب دکمه‌ی بستن برای دوره‌ای که قبلاً بازگشایی شده است. */
export const FISCAL_PERIOD_RECLOSE_LABEL = 'بستن دوباره';

export const FISCAL_PERIOD_DEMO_OPTIONS = [
  { value: 'normal', label: 'عادی' },
  { value: 'closednow', label: 'دوره‌ی جاری بسته' },
  { value: 'noopen', label: 'بدون دوره‌ی باز' },
  { value: 'empty', label: 'بدون سال مالی' },
] as const satisfies readonly FiscalDemoOption[];

export const REOPEN_REASON_MIN_LENGTH = 10;
