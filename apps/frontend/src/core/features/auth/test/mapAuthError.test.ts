import { describe, expect, it } from "vitest";
import { mapAuthError } from "../utils/mapAuthError";

const body = (message: string, details?: { field: string; code: string; message: string }[]) => ({
  error: { code: "X", category: "validation", message, correlationId: "c", details },
});

describe("mapAuthError", () => {
  it("401 همیشه پیام عمومی امن می‌دهد", () => {
    const msg = "ایمیل یا رمز عبور نادرست است.";
    expect(mapAuthError({ status: 401 })).toBe(msg);
    expect(mapAuthError({ status: 401, body: body("secret reason") })).toBe(msg);
  });

  it("400 پیام اولین details را برمی‌گرداند", () => {
    expect(
      mapAuthError({
        status: 400,
        body: body("failed", [{ field: "email", code: "invalid", message: "ایمیل نامعتبر" }]),
      }),
    ).toBe("ایمیل نامعتبر");
  });

  it("400 بدون details از message بدنه استفاده می‌کند", () => {
    expect(mapAuthError({ status: 400, body: body("پیام بک‌اند") })).toBe("پیام بک‌اند");
  });

  it("400 بدون بدنه پیام پیش‌فرض می‌دهد", () => {
    expect(mapAuthError({ status: 400 })).toBe("اطلاعات واردشده معتبر نیست.");
  });

  it("سایر خطاها با message بدنه", () => {
    expect(mapAuthError({ status: 500, body: body("boom") })).toBe("boom");
  });

  it("قطع شبکه / خطای ناشناخته", () => {
    const msg = "خطا در ارتباط با سرور. دوباره تلاش کنید.";
    expect(mapAuthError({})).toBe(msg);
    expect(mapAuthError(new TypeError("fetch failed") as never)).toBe(msg);
    expect(mapAuthError(undefined)).toBe(msg);
  });
});
