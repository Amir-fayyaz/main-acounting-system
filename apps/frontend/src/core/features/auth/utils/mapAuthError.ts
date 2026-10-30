import { getFieldErrors, normalizeApiError } from '@repo/web/api';

export const NETWORK_ERROR_MESSAGE = 'خطا در ارتباط با سرور. دوباره تلاش کنید.';

export function mapAuthError(error: unknown): string {
  const normalized = normalizeApiError(error);
  const details = normalized.details;

  const passwordPolicyError =
    /password must be a non-blank string of at least 12 and at most 128 characters/i;

  const hasPasswordPolicyError =
    passwordPolicyError.test(normalized.message) ||
    details.some((detail) => passwordPolicyError.test(detail.message));

  if (hasPasswordPolicyError || normalized.status === 401) {
    return 'ایمیل یا رمز عبور نادرست است.';
  }

  if (normalized.status === 403) {
    return 'شما اجازه‌ی انجام این عملیات را ندارید.';
  }

  if (normalized.status === 409) {
    return 'این ایمیل قبلاً ثبت شده است.';
  }

  if (normalized.status === 422) {
    return 'اطلاعات واردشده پذیرفته نشد. ورودی‌ها را بررسی و دوباره تلاش کنید.';
  }

  if (normalized.status === 400) {
    if (details[0]?.message) {
      return details[0].message;
    }

    return normalized.source === 'backend' ? normalized.message : 'اطلاعات واردشده معتبر نیست.';
  }

  if (normalized.kind === 'http' && normalized.source === 'backend') {
    return normalized.message;
  }

  return NETWORK_ERROR_MESSAGE;
}

export type SignUpField = 'displayName' | 'email' | 'password';

export type SignUpFieldErrors = Partial<Record<SignUpField, string>>;

const SIGN_UP_FIELDS = ['displayName', 'email', 'password'] as const;

/** خطای هر فیلد فرم ثبت‌نام از پاسخ بک‌اند. */
export function mapSignUpFieldErrors(error: unknown): SignUpFieldErrors {
  const normalized = normalizeApiError(error);

  if (normalized.status === 409) {
    return { email: mapAuthError(normalized) };
  }

  if (normalized.category === 'validation') {
    return getFieldErrors(normalized, SIGN_UP_FIELDS);
  }

  return {};
}
