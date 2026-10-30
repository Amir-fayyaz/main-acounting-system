import { describe, expect, it } from 'vitest';
import { createHttpApiError } from '@repo/web/api';
import { mapAuthError, mapSignUpFieldErrors } from '../utils/mapAuthError';

const body = (message: string, details?: { field: string; code: string; message: string }[]) => ({
  error: {
    code: 'X',
    category: 'validation',
    message,
    correlationId: 'c',
    details,
  },
});

describe('mapAuthError', () => {
  it('401 همیشه پیام عمومی امن می‌دهد', () => {
    const msg = 'ایمیل یا رمز عبور نادرست است.';
    expect(mapAuthError(createHttpApiError(401))).toBe(msg);
    expect(mapAuthError(createHttpApiError(401, body('secret reason')))).toBe(msg);
  });

  it('403 را مستقل از 401 نمایش می‌دهد', () => {
    expect(mapAuthError(createHttpApiError(403))).toBe('شما اجازه‌ی انجام این عملیات را ندارید.');
  });

  it('409 پیام ایمیل تکراری می‌دهد', () => {
    expect(mapAuthError(createHttpApiError(409))).toBe('این ایمیل قبلاً ثبت شده است.');
    // پیام انگلیسی بک‌اند هرگز به کاربر نشان داده نمی‌شود
    expect(mapAuthError(createHttpApiError(409, body('A user with this email exists')))).toBe(
      'این ایمیل قبلاً ثبت شده است.',
    );
  });

  it('422 پیام فارسی ثابت می‌دهد', () => {
    expect(
      mapAuthError(createHttpApiError(422, body('password must be at least 12 characters'))),
    ).toBe('اطلاعات واردشده پذیرفته نشد. ورودی‌ها را بررسی و دوباره تلاش کنید.');
  });

  it('400 پیام اولین details را برمی‌گرداند', () => {
    expect(
      mapAuthError(
        createHttpApiError(
          400,
          body('failed', [{ field: 'email', code: 'invalid', message: 'ایمیل نامعتبر' }]),
        ),
      ),
    ).toBe('ایمیل نامعتبر');
  });

  it('400 بدون details از message بدنه استفاده می‌کند', () => {
    expect(mapAuthError(createHttpApiError(400, body('پیام بک‌اند')))).toBe('پیام بک‌اند');
  });

  it('400 بدون بدنه پیام پیش‌فرض می‌دهد', () => {
    expect(mapAuthError(createHttpApiError(400))).toBe('اطلاعات واردشده معتبر نیست.');
  });

  it('سایر خطاها با message بدنه', () => {
    expect(mapAuthError(createHttpApiError(500, body('boom')))).toBe('boom');
  });

  it('قطع شبکه / خطای ناشناخته', () => {
    const msg = 'خطا در ارتباط با سرور. دوباره تلاش کنید.';
    expect(mapAuthError({})).toBe(msg);
    expect(mapAuthError(new TypeError('fetch failed'))).toBe(msg);
    expect(mapAuthError(undefined)).toBe(msg);
  });
});

describe('mapSignUpFieldErrors', () => {
  it('409 خطا را روی فیلد ایمیل می‌گذارد', () => {
    expect(mapSignUpFieldErrors(createHttpApiError(409))).toEqual({
      email: 'این ایمیل قبلاً ثبت شده است.',
    });
  });

  it('400 فقط فیلدهای شناخته‌شده‌ی فرم را برمی‌گرداند', () => {
    const error = createHttpApiError(
      400,
      body('x', [
        { field: 'password', code: 'minLength', message: 'password too short' },
        { field: 'displayName', code: 'isString', message: 'bad' },
        { field: 'company', code: 'whitelist', message: 'unknown' },
      ]),
    );

    expect(mapSignUpFieldErrors(error)).toEqual({
      password: 'password too short',
      displayName: 'bad',
    });
  });

  it('برای سایر خطاها شیء خالی برمی‌گرداند', () => {
    expect(mapSignUpFieldErrors(createHttpApiError(500))).toEqual({});
    expect(mapSignUpFieldErrors(createHttpApiError(422))).toEqual({});
    expect(mapSignUpFieldErrors(undefined)).toEqual({});
  });
});
