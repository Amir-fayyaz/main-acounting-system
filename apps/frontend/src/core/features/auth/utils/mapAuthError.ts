import type { AuthApiError } from '../assets/@types/auth.types';

export const NETWORK_ERROR_MESSAGE =
  'خطا در ارتباط با سرور. دوباره تلاش کنید.';

export function mapAuthError(
  err: AuthApiError | null | undefined,
): string {
  const details = err?.body?.error?.details;

  const passwordPolicyError =
    /password must be a non-blank string of at least 12 and at most 128 characters/i;

  const hasPasswordPolicyError =
    passwordPolicyError.test(err?.body?.error?.message ?? '') ||
    (Array.isArray(details) &&
      details.some(
        (detail) =>
          typeof detail.message === 'string' &&
          passwordPolicyError.test(detail.message),
      ));

  if (hasPasswordPolicyError || err?.status === 401) {
    return 'ایمیل یا رمز عبور نادرست است.';
  }

  if (err?.status === 409) {
    return 'این ایمیل قبلاً ثبت شده است.';
  }

  if (err?.status === 422) {
    return 'اطلاعات واردشده پذیرفته نشد. ورودی‌ها را بررسی و دوباره تلاش کنید.';
  }

  if (err?.status === 400) {
    if (Array.isArray(details) && details[0]?.message) {
      return details[0].message;
    }

    return err?.body?.error?.message ?? 'اطلاعات واردشده معتبر نیست.';
  }

  if (err?.body?.error?.message) {
    return err.body.error.message;
  }

  return NETWORK_ERROR_MESSAGE;
}

export type SignUpField = 'displayName' | 'email' | 'password';

export type SignUpFieldErrors = Partial<
  Record<SignUpField, string>
>;

const SIGN_UP_FIELDS: readonly string[] = [
  'displayName',
  'email',
  'password',
];

/** خطای هر فیلد فرم ثبت‌نام از پاسخ بک‌اند. */
export function mapSignUpFieldErrors(
  err: AuthApiError | null | undefined,
): SignUpFieldErrors {
  const out: SignUpFieldErrors = {};

  if (err?.status === 409) {
    out.email = mapAuthError(err);
    return out;
  }

  if (err?.status === 400 && Array.isArray(err.body?.error?.details)) {
    for (const d of err.body.error.details) {
      if (
        SIGN_UP_FIELDS.includes(d.field) &&
        !out[d.field as SignUpField]
      ) {
        out[d.field as SignUpField] = 'مقدار واردشده معتبر نیست.';
      }
    }
  }

  return out;
}