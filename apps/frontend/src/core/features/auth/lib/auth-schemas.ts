import * as z from "zod/mini";
import { ZodString } from "../../../lib/zod/zod";

const emailField = () =>
  z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "ایمیل را وارد کنید"),
      z.email("ایمیل وارد شده معتبر نیست"),
    );

/** موبایل ایرانی: 09xxxxxxxxx (۱۱ رقم) */
const mobileField = () =>
  z
    .string()
    .check(
      z.trim(),
      z.minLength(1, "شماره موبایل را وارد کنید"),
      z.regex(/^09\d{9}$/, "شماره موبایل باید مثل 09123456789 باشد"),
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

export const registerSchema = z
  .object({
    name: ZodString({ min: 2, message: "نام و نام خانوادگی را وارد کنید" }),
    company: ZodString({ min: 2, message: "نام شرکت را وارد کنید" }),
    mobile: mobileField(),
    email: emailField(),
    password: newPasswordField(),
    password2: z.string().check(z.minLength(1, "تکرار رمز عبور را وارد کنید")),
    terms: z.boolean().check(
      z.refine((v) => v === true, "برای ادامه باید قوانین را بپذیرید."),
    ),
  })
  .check(
    z.refine((v) => v.password === v.password2, {
      message: "تکرار رمز با رمز عبور یکسان نیست.",
      path: ["password2"],
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
