import type {
  FiscalPeriod,
  FiscalPeriodDraft,
  FiscalYear,
} from '../assets/@types/fiscal-periods.types';
import { formatJalaliDate } from '../utils/format';
import { normalizeJalaliDate } from './jalali-date';
import { REOPEN_REASON_MIN_LENGTH } from './fiscal-period.config';

export interface FiscalPeriodValidationContext {
  year: FiscalYear | null;
  /** دوره‌های همان سال؛ برای بررسی هم‌پوشانی. */
  periods: readonly FiscalPeriod[];
}

export interface ValidatedFiscalPeriodDraft {
  name: string;
  from: string;
  to: string;
}

/**
 * پیام خطای فارسی یا `null` در صورت معتبر بودن.
 * طبق قواعد پروژه، در لایه‌ی دامنه استثنا پرتاب نمی‌شود.
 */
export function validateFiscalPeriodDraft(
  draft: FiscalPeriodDraft,
  { year, periods }: FiscalPeriodValidationContext,
): string | null {
  if (!year) return 'ابتدا سال مالی را انتخاب کنید.';

  const name = draft.name.trim();
  if (!name) return 'نام دوره را وارد کنید.';

  const from = normalizeJalaliDate(draft.from);
  const to = normalizeJalaliDate(draft.to);

  if (!from || !to) return 'تاریخ را به شکل شمسی و معتبر وارد کنید؛ مثال: ۱۴۰۵/۰۹/۰۱';

  if (to < from) return 'تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد.';

  if (from < year.from || to > year.to) {
    return `بازه‌ی دوره باید داخل ${year.title} (${formatJalaliDate(year.from)} تا ${formatJalaliDate(year.to)}) باشد.`;
  }

  const overlapping = periods.find((period) => !(to < period.from || from > period.to));
  if (overlapping) return `این بازه با دوره‌ی «${overlapping.name}» هم‌پوشانی دارد.`;

  return null;
}

export function normalizePeriodDraft(draft: FiscalPeriodDraft): ValidatedFiscalPeriodDraft | null {
  const from = normalizeJalaliDate(draft.from);
  const to = normalizeJalaliDate(draft.to);

  if (!from || !to) return null;

  return { name: draft.name.trim(), from, to };
}

export function validateReopenReason(reason: string): string | null {
  if (reason.trim().length < REOPEN_REASON_MIN_LENGTH) {
    return `دلیل بازگشایی باید حداقل ${REOPEN_REASON_MIN_LENGTH} حرف باشد.`;
  }

  return null;
}
