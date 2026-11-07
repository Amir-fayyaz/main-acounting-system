/** وضعیت‌های ممکن یک دوره‌ی مالی طبق منطق نمونه (`fiscal.js`). */
export type FiscalPeriodStatus = 'open' | 'review' | 'closing' | 'closed' | 'reopened';

/** حالت‌های نمایشی داده‌ی ماک برای بررسی وضعیت‌های مختلف صفحه. */
export type FiscalDemoMode = 'normal' | 'closednow' | 'noopen' | 'empty';

export interface FiscalYear {
  id: string;
  /** عنوان نمایشی، مثل «سال مالی ۱۴۰۵». */
  title: string;
  /** تاریخ شروع به شکل `1405/01/01`. */
  from: string;
  /** تاریخ پایان به شکل `1405/12/29`. */
  to: string;
}

export interface FiscalPeriod {
  id: string;
  yearId: string;
  /** نام نمایشی دوره، مثل «آبان ۱۴۰۵». */
  name: string;
  /** تاریخ شروع شمسی به شکل `1405/08/01`. */
  from: string;
  /** تاریخ پایان شمسی به شکل `1405/08/30`. */
  to: string;
  status: FiscalPeriodStatus;
}

export interface FiscalAuditLog {
  id: string;
  /** زمان ثبت‌شده برای نمایش، مثل `۱۴۰۵/۰۸/۱۲ ۱۰:۲۴`. */
  at: string;
  actor: string;
  /** عنوان عملیات، مثل «بستن دوره». */
  action: string;
  periodName: string;
  reason?: string;
}

export interface FiscalPeriodsDataset {
  years: FiscalYear[];
  periods: FiscalPeriod[];
  logs: FiscalAuditLog[];
}

export interface FiscalPeriodStats {
  total: number;
  open: number;
  closed: number;
}

export interface FiscalPeriodDraft {
  name: string;
  from: string;
  to: string;
}

/** عملیات قابل انجام روی هر ردیف دوره. */
export type FiscalPeriodAction = 'review' | 'open' | 'close' | 'reopen';

export interface FiscalDemoOption {
  value: FiscalDemoMode;
  label: string;
}
