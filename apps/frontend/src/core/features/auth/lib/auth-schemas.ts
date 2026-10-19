import * as z from "zod/mini";
const emailField = () =>
  z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "ایمیل را وارد کنید"),
      z.email("ایمیل وارد شده معتبر نیست"),
    );


const newPasswordField = () =>
  z
    .string()
    .check(
      z.minLength(1, "رمز عبور را وارد کنید"),
      z.minLength(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
    );

/** sign-in: طول حداقل عمداً چک نمی‌شود تا با API هماهنگ بماند */
export const signInSchema = z.object({
  email: emailField(),
  password: z.string().check(z.minLength(1, "رمز عبور را وارد کنید")),
});

export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .check(
        z.trim(),
        z.minLength(1, "نام کاربری را وارد کنید"),
      ),
    email: emailField(),
    password: newPasswordField(),
    password2: z
      .string()
      .check(
        z.minLength(1, "تکرار رمز عبور را وارد کنید"),
      ),
  })
  .check(
    z.check((ctx) => {
      if (ctx.value.password !== ctx.value.password2) {
        ctx.issues.push({
          code: "custom",
          message: "رمز عبور و تکرار آن یکسان نیستند",
          path: ["password2"],
          input: ctx.value.password2,
        });
      }
    }),
  );

/** ایمیل یا موبایل */
export const forgotStep1Schema = z.object({
  id: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "ایمیل یا شماره موبایل را وارد کنید"),
      z.refine(
        (v) => z.safeParse(emailField(), v).success || /^09\d{9}$/.test(v),
        "ایمیل یا شماره موبایل معتبر وارد کنید",
      ),
    ),
});

export const forgotStep2Schema = z.object({
  otp: z.string().check(z.regex(/^\d{6}$/, "کد ۶ رقمی را کامل وارد کنید.")),
  password: newPasswordField(),
});

/** خروجی خطاهای zod را به { [field]: پیام اول } تبدیل می‌کند. */
export function fieldErrors(error: {
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}
