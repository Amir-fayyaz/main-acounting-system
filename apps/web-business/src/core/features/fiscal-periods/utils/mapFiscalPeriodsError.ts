import { normalizeApiError } from '@repo/web/api';

const CODE_MESSAGES: Record<string, string> = {
  PERIOD_STATE_INVALID: 'وضعیت فعلی دوره اجازه‌ی این عملیات را نمی‌دهد.',
  FISCAL_PERIOD_NOT_OPEN: 'فقط دوره‌ی باز می‌تواند دوره‌ی جاری شود.',
  REOPEN_REASON_REQUIRED: 'برای بازگشایی، دلیل معتبر وارد کنید.',
  FISCAL_PERIOD_NOT_FOUND: 'دوره‌ی مالی موردنظر پیدا نشد.',
  TENANT_ACCESS_DENIED: 'به شرکت انتخابی دسترسی ندارید.',
  AUTHORIZATION_DENIED: 'اجازه‌ی انجام این عملیات را ندارید.',
};

export function mapFiscalPeriodsError(error: unknown): string {
  const apiError = normalizeApiError(error);

  if (apiError.kind === 'network') return 'ارتباط با سرور برقرار نشد.';
  if (apiError.kind === 'invalid-response')
    return 'پاسخ سرور با قرارداد دوره‌های مالی سازگار نیست.';
  if (apiError.status === 401) return 'نشست شما معتبر نیست؛ دوباره وارد شوید.';
  if (apiError.status === 403) return 'اجازه‌ی مدیریت دوره‌های مالی را ندارید.';

  const mapped = apiError.code ? CODE_MESSAGES[apiError.code] : undefined;
  if (mapped) return mapped;

  if (apiError.status === 404) return 'دوره‌ی مالی موردنظر پیدا نشد.';

  return 'خطایی غیرمنتظره رخ داد.';
}
