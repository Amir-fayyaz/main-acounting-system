import type { ZodError } from 'zod';

/**
 * خطاهای Zod را به نگاشت «نام فیلد → اولین پیام خطا» تبدیل می‌کند
 * و فقط فیلدهایی را نگه می‌دارد که فرم می‌شناسد.
 */
export function mapZodErrorsToKnownFields<T extends string>(
  error: ZodError,
  knownFields: ReadonlySet<T>,
): Partial<Record<T, string>> {
  const errors: Partial<Record<T, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!knownFields.has(field as T)) continue;
    if (!errors[field as T]) errors[field as T] = issue.message;
  }

  return errors;
}
