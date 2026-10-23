import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import {
  fieldErrors,
  forgotStep1Schema,
  forgotStep2Schema,
  signUpSchema,
  signInSchema,
} from '../lib/auth-schemas';

const errorsOf = (schema: z.ZodMiniType, data: unknown) => {
  const result = z.safeParse(schema, data);
  return result.success ? {} : fieldErrors(result.error);
};

const validSignUp = {
  displayName: 'علی رضایی',
  email: 'ali@company.ir',
  password: '12345678abcd',
  password2: '12345678abcd',
};

describe('signInSchema', () => {
  it('برای فیلدهای خالی خطا می‌دهد', () => {
    const errors = errorsOf(signInSchema, { email: '', password: '' });

    expect(errors.email).toBe('ایمیل را وارد کنید');
    expect(errors.password).toBe('رمز عبور را وارد کنید');
  });

  it('ایمیل نامعتبر را رد می‌کند', () => {
    expect(errorsOf(signInSchema, { email: 'abc', password: 'x' }).email).toBe(
      'ایمیل وارد شده معتبر نیست',
    );
  });

  it('رمز عبور کوتاه را می‌پذیرد', () => {
    expect(errorsOf(signInSchema, { email: 'a@b.co', password: '1' })).toEqual({});
  });

  it('فاصله‌های ابتدا و انتهای ایمیل را حذف می‌کند', () => {
    const result = z.safeParse(signInSchema, {
      email: '  a@b.co ',
      password: '1',
    });

    expect(result.success && result.data.email).toBe('a@b.co');
  });
});

describe('signUpSchema', () => {
  it('اطلاعات معتبر را می‌پذیرد', () => {
    expect(z.safeParse(signUpSchema, validSignUp).success).toBe(true);
  });

  it('نام نمایشی خالی را رد می‌کند', () => {
    expect(errorsOf(signUpSchema, { ...validSignUp, displayName: '' }).displayName).toBe(
      'نام نمایشی را وارد کنید',
    );
  });

  it('ایمیل نامعتبر را رد می‌کند', () => {
    expect(errorsOf(signUpSchema, { ...validSignUp, email: 'invalid' }).email).toBe(
      'ایمیل وارد شده معتبر نیست',
    );
  });

  it('رمز عبور کمتر از ۱۲ کاراکتر را رد می‌کند (سیاست بک‌اند)', () => {
    const short = '1'.repeat(11);
    const errors = errorsOf(signUpSchema, { ...validSignUp, password: short, password2: short });

    expect(errors.password).toBe('رمز عبور باید حداقل ۱۲ کاراکتر باشد');
  });

  it('رمز عبور دقیقاً ۱۲ کاراکتری را می‌پذیرد', () => {
    const ok = '1'.repeat(12);
    expect(errorsOf(signUpSchema, { ...validSignUp, password: ok, password2: ok })).toEqual({});
  });

  it('رمز عبور بیشتر از ۱۲۸ کاراکتر را رد می‌کند', () => {
    const long = 'a'.repeat(129);
    const errors = errorsOf(signUpSchema, { ...validSignUp, password: long, password2: long });

    expect(errors.password).toBe('رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد');
  });

  it('رمز عبوری که فقط فاصله است را رد می‌کند', () => {
    const blank = ' '.repeat(12);
    const errors = errorsOf(signUpSchema, { ...validSignUp, password: blank, password2: blank });

    expect(errors.password).toBe('رمز عبور نمی‌تواند فقط شامل فاصله باشد');
  });

  it('نام نمایشی بیشتر از ۲۰۰ کاراکتر را رد می‌کند', () => {
    expect(
      errorsOf(signUpSchema, { ...validSignUp, displayName: 'a'.repeat(201) }).displayName,
    ).toBe('نام نمایشی نباید بیشتر از ۲۰۰ کاراکتر باشد');
  });

  it('نام نمایشی فقط-فاصله را رد می‌کند', () => {
    expect(errorsOf(signUpSchema, { ...validSignUp, displayName: '   ' }).displayName).toBe(
      'نام نمایشی را وارد کنید',
    );
  });

  it('تکرار رمز عبور متفاوت را رد می‌کند', () => {
    const errors = errorsOf(signUpSchema, {
      ...validSignUp,
      password2: 'different1',
    });

    expect(errors.password2).toBe('رمز عبور و تکرار آن یکسان نیستند');
  });

  it('تکرار رمز عبور خالی را رد می‌کند', () => {
    expect(errorsOf(signUpSchema, { ...validSignUp, password2: '' }).password2).toBe(
      'تکرار رمز عبور را وارد کنید',
    );
  });
});

describe('forgot schemas', () => {
  it('مرحله اول ایمیل یا موبایل معتبر را می‌پذیرد', () => {
    expect(errorsOf(forgotStep1Schema, { id: 'a@b.co' })).toEqual({});
    expect(errorsOf(forgotStep1Schema, { id: '09123456789' })).toEqual({});
    expect(errorsOf(forgotStep1Schema, { id: '' }).id).toBeTruthy();
    expect(errorsOf(forgotStep1Schema, { id: 'hello' }).id).toBeTruthy();
  });

  it('مرحله دوم کد ۶ رقمی و رمز معتبر را می‌پذیرد', () => {
    expect(
      errorsOf(forgotStep2Schema, {
        otp: '123456',
        password: '12345678abcd',
      }),
    ).toEqual({});

    const errors = errorsOf(forgotStep2Schema, {
      otp: '123',
      password: '1',
    });

    expect(errors.otp).toBe('کد ۶ رقمی را کامل وارد کنید.');
    expect(errors.password).toBeTruthy();
  });
});
