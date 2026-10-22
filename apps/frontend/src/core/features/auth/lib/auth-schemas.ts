import * as z from 'zod/mini';

/** سیاست‌ها باید با بک‌اند یکی باشند (PlainPassword / UserName / UserEmail). */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const DISPLAY_NAME_MAX_LENGTH = 200;
export const EMAIL_MAX_LENGTH = 254;

const fa = (n: number) => n.toLocaleString('fa-IR');

/** متن راهنمای رمز عبور (placeholder فرم‌ها) */
export const PASSWORD_HINT = `حداقل ${fa(PASSWORD_MIN_LENGTH)} کاراکتر`;

const emailField = () =>
  z
    .string()
    .check(
      z.trim(),
      z.minLength(1, 'ایمیل را وارد کنید'),
      z.maxLength(EMAIL_MAX_LENGTH, `ایمیل نباید بیشتر از ${fa(EMAIL_MAX_LENGTH)} کاراکتر باشد`),
      z.email('ایمیل وارد شده معتبر نیست'),
    );

const newPasswordField = () =>
  z.string().check(
    z.minLength(1, 'رمز عبور را وارد کنید'),
    z.minLength(PASSWORD_MIN_LENGTH, `رمز عبور باید ${PASSWORD_HINT} باشد`),
    z.maxLength(
      PASSWORD_MAX_LENGTH,
      `رمز عبور نباید بیشتر از ${fa(PASSWORD_MAX_LENGTH)} کاراکتر باشد`,
    ),
    z.refine((v) => v.trim() !== '', 'رمز عبور نمی‌تواند فقط شامل فاصله باشد'),
  );

/** sign-in: طول حداقل عمداً چک نمی‌شود تا با API هماهنگ بماند */
export const signInSchema = z.object({
  email: emailField(),
  password: z.string().check(z.minLength(1, 'رمز عبور را وارد کنید')),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .check(
        z.trim(),
        z.minLength(1, 'نام نمایشی را وارد کنید'),
        z.maxLength(
          DISPLAY_NAME_MAX_LENGTH,
          `نام نمایشی نباید بیشتر از ${fa(DISPLAY_NAME_MAX_LENGTH)} کاراکتر باشد`,
        ),
      ),
    email: emailField(),
    password: newPasswordField(),
    password2: z.string().check(z.minLength(1, 'تکرار رمز عبور را وارد کنید')),
  })
  .check(
    z.refine((v) => v.password === v.password2, {
      message: 'رمز عبور و تکرار آن یکسان نیستند',
      path: ['password2'],
    }),
  );

/** ایمیل یا موبایل */
export const forgotStep1Schema = z.object({
  id: z.string().check(
    z.trim(),
    z.minLength(1, 'ایمیل یا شماره موبایل را وارد کنید'),
    z.refine(
      (v) => z.safeParse(emailField(), v).success || /^09\d{9}$/.test(v),
      'ایمیل یا شماره موبایل معتبر وارد کنید',
    ),
  ),
});

export const forgotStep2Schema = z.object({
  otp: z.string().check(z.regex(/^\d{6}$/, 'کد ۶ رقمی را کامل وارد کنید.')),
  password: newPasswordField(),
});

/** خروجی خطاهای zod را به { [field]: پیام اول } تبدیل می‌کند. */
export function fieldErrors(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}
