import { describe, expect, it } from "vitest";
import * as z from "zod/mini";
import {
  fieldErrors,
  forgotStep1Schema,
  forgotStep2Schema,
  registerSchema,
  signInSchema,
} from "../lib/auth-schemas";

const errorsOf = (schema: z.ZodMiniType, data: unknown) => {
  const r = z.safeParse(schema, data);
  return r.success ? {} : fieldErrors(r.error);
};

const validRegister = {
  name: "علی رضایی",
  company: "شرکت نمونه",
  mobile: "09123456789",
  email: "ali@company.ir",
  password: "12345678",
  password2: "12345678",
  terms: true,
};

describe("signInSchema", () => {
  it("فیلد خالی خطا می‌دهد", () => {
    const e = errorsOf(signInSchema, { email: "", password: "" });
    expect(e.email).toBe("ایمیل را وارد کنید");
    expect(e.password).toBe("رمز عبور را وارد کنید");
  });

  it("ایمیل نامعتبر", () => {
    expect(errorsOf(signInSchema, { email: "abc", password: "x" }).email).toBe(
      "ایمیل وارد شده معتبر نیست",
    );
  });

  it("طول رمز بررسی نمی‌شود (هماهنگ با API)", () => {
    expect(errorsOf(signInSchema, { email: "a@b.co", password: "1" })).toEqual({});
  });

  it("ایمیل trim می‌شود", () => {
    const r = z.safeParse(signInSchema, { email: "  a@b.co ", password: "1" });
    expect(r.success && r.data.email).toBe("a@b.co");
  });
});

describe("registerSchema", () => {
  it("داده‌ی معتبر پذیرفته می‌شود", () => {
    expect(z.safeParse(registerSchema, validRegister).success).toBe(true);
  });

  it("موبایل باید الگوی 09xxxxxxxxx باشد", () => {
    for (const mobile of ["9123456789", "0912345678", "+989123456789", "abc"]) {
      expect(errorsOf(registerSchema, { ...validRegister, mobile }).mobile).toBeTruthy();
    }
  });

  it("رمز حداقل ۸ کاراکتر", () => {
    const e = errorsOf(registerSchema, { ...validRegister, password: "1234567", password2: "1234567" });
    expect(e.password).toBe("رمز عبور باید حداقل ۸ کاراکتر باشد");
  });

  it("تکرار رمز باید برابر باشد", () => {
    const e = errorsOf(registerSchema, { ...validRegister, password2: "different1" });
    expect(e.password2).toBe("تکرار رمز با رمز عبور یکسان نیست.");
  });

  it("نام و شرکت حداقل ۲ کاراکتر", () => {
    const e = errorsOf(registerSchema, { ...validRegister, name: "a", company: "" });
    expect(e.name).toBeTruthy();
    expect(e.company).toBeTruthy();
  });

  it("پذیرش قوانین الزامی است", () => {
    expect(errorsOf(registerSchema, { ...validRegister, terms: false }).terms).toBe(
      "برای ادامه باید قوانین را بپذیرید.",
    );
  });
});

describe("forgot schemas", () => {
  it("step1 ایمیل یا موبایل می‌پذیرد", () => {
    expect(errorsOf(forgotStep1Schema, { id: "a@b.co" })).toEqual({});
    expect(errorsOf(forgotStep1Schema, { id: "09123456789" })).toEqual({});
    expect(errorsOf(forgotStep1Schema, { id: "" }).id).toBeTruthy();
    expect(errorsOf(forgotStep1Schema, { id: "hello" }).id).toBeTruthy();
  });

  it("step2 کد ۶ رقمی و رمز ۸ کاراکتری", () => {
    expect(errorsOf(forgotStep2Schema, { otp: "123456", password: "12345678" })).toEqual({});
    const e = errorsOf(forgotStep2Schema, { otp: "123", password: "1" });
    expect(e.otp).toBe("کد ۶ رقمی را کامل وارد کنید.");
    expect(e.password).toBeTruthy();
  });
});
