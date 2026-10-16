import type { AuthApiError } from "../assets/@types/auth.types";

export function mapAuthError(err: AuthApiError | null | undefined): string {
  if (err?.status === 401) {
    return "ایمیل یا رمز عبور نادرست است.";
  }
  if (err?.status === 400) {
    const details = err.body?.error?.details;
    if (Array.isArray(details) && details[0]?.message) {
      return details[0].message;
    }
    return err.body?.error?.message ?? "اطلاعات واردشده معتبر نیست.";
  }
  if (err?.body?.error?.message) {
    return err.body.error.message;
  }
  return "خطا در ارتباط با سرور. دوباره تلاش کنید.";
}
