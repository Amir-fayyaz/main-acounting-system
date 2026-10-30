import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInApi: vi.fn(),
  setAuthToken: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push, refresh: m.refresh }) }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('../lib/auth-api', () => ({ signInApi: m.signInApi }));
vi.mock('../lib/auth-storage', () => ({ setAuthToken: m.setAuthToken }));

import { LoginForm } from '../components/block/LoginForm';
import { createHttpApiError } from '@repo/web/api';

const session = {
  token: 'tok',
  tokenType: 'Bearer',
  expiresAt: '2026-01-01T01:00:00Z',
  principal: { userId: '1', displayName: 'Ali', email: 'ali@company.ir' },
};

const user = userEvent.setup();
const submitButton = () => screen.getByRole('button', { name: 'ورود' });

async function fill(email: string, password: string) {
  await user.type(screen.getByLabelText('ایمیل'), email);
  await user.type(screen.getByLabelText('رمز عبور'), password);
}

beforeEach(() => {
  Object.values(m).forEach((v) => (typeof v === 'function' ? v.mockReset() : null));
  Object.values(m.toast).forEach((fn) => fn.mockReset());
  m.setAuthToken.mockResolvedValue(undefined);
});

describe('LoginForm — اعتبارسنجی', () => {
  it('فرم خالی خطای هر فیلد را نشان می‌دهد و درخواستی نمی‌فرستد', async () => {
    render(<LoginForm />);
    await user.click(submitButton());

    expect(screen.getByText('ایمیل را وارد کنید')).toBeInTheDocument();
    expect(screen.getByText('رمز عبور را وارد کنید')).toBeInTheDocument();
    expect(m.signInApi).not.toHaveBeenCalled();
  });

  it('ایمیل نامعتبر خطا می‌دهد', async () => {
    render(<LoginForm />);
    await fill('abc', 'secret');
    await user.click(submitButton());

    expect(screen.getByText('ایمیل وارد شده معتبر نیست')).toBeInTheDocument();
    expect(m.signInApi).not.toHaveBeenCalled();
  });

  it('با تایپ، خطای همان فیلد پاک می‌شود', async () => {
    render(<LoginForm />);
    await user.click(submitButton());
    await user.type(screen.getByLabelText('ایمیل'), 'a');

    expect(screen.queryByText('ایمیل را وارد کنید')).not.toBeInTheDocument();
    expect(screen.getByText('رمز عبور را وارد کنید')).toBeInTheDocument();
  });
});

describe('LoginForm — ورود', () => {
  it('موفقیت: کوکی ست می‌شود، toast موفقیت و ریدایرکت به /', async () => {
    m.signInApi.mockResolvedValue(session);
    render(<LoginForm />);
    await fill('ali@company.ir', 'secret');
    await user.click(submitButton());

    await waitFor(() => expect(m.push).toHaveBeenCalledWith('/'));
    expect(m.signInApi).toHaveBeenCalledWith({ email: 'ali@company.ir', password: 'secret' });
    expect(m.setAuthToken).toHaveBeenCalledWith('tok', session.expiresAt, true);
    expect(m.toast.success).toHaveBeenCalled();
  });

  it('«مرا به خاطر بسپار» خاموش یعنی remember=false', async () => {
    m.signInApi.mockResolvedValue(session);
    render(<LoginForm />);
    await user.click(screen.getByLabelText('مرا به خاطر بسپار'));
    await fill('ali@company.ir', 'secret');
    await user.click(submitButton());

    await waitFor(() =>
      expect(m.setAuthToken).toHaveBeenCalledWith('tok', session.expiresAt, false),
    );
  });

  it('401: پیام عمومی امن و بدون ریدایرکت', async () => {
    m.signInApi.mockRejectedValue(createHttpApiError(401));
    render(<LoginForm />);
    await fill('ali@company.ir', 'wrong');
    await user.click(submitButton());

    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith('ایمیل یا رمز عبور نادرست است.'),
    );
    expect(m.setAuthToken).not.toHaveBeenCalled();
    expect(m.push).not.toHaveBeenCalled();
  });

  it('قطع شبکه: پیام خطا در ارتباط با سرور', async () => {
    m.signInApi.mockRejectedValue(new TypeError('fetch failed'));
    render(<LoginForm />);
    await fill('ali@company.ir', 'secret');
    await user.click(submitButton());

    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith('خطا در ارتباط با سرور. دوباره تلاش کنید.'),
    );
  });

  it('شکست ذخیره‌ی کوکی بعد از ورود موفق پیام جدا دارد و ریدایرکت نمی‌کند', async () => {
    m.signInApi.mockResolvedValue(session);
    m.setAuthToken.mockRejectedValue(new Error('cookie'));
    render(<LoginForm />);
    await fill('ali@company.ir', 'secret');
    await user.click(submitButton());

    await waitFor(() =>
      expect(m.toast.error).toHaveBeenCalledWith(
        'ورود انجام شد اما ذخیره‌ی نشست ناموفق بود. دوباره تلاش کنید.',
      ),
    );
    expect(m.push).not.toHaveBeenCalled();
  });

  it('حین ارسال دکمه غیرفعال است و دوبار کلیک فقط یک درخواست می‌فرستد', async () => {
    m.signInApi.mockReturnValue(new Promise(() => {}));
    render(<LoginForm />);
    await fill('ali@company.ir', 'secret');
    await user.click(submitButton());

    await waitFor(() => expect(submitButton()).toBeDisabled());
    await user.click(submitButton());
    expect(m.signInApi).toHaveBeenCalledTimes(1);
  });
});

describe('LoginForm — رمز عبور', () => {
  it('دکمه‌ی چشم نمایش رمز را تغییر می‌دهد', async () => {
    render(<LoginForm />);
    const input = screen.getByLabelText('رمز عبور');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'نمایش رمز' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'پنهان کردن رمز' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});

describe('LoginForm — لینک‌ها', () => {
  it('لینک فراموشی رمز و ثبت‌نام به مسیر درست می‌روند', () => {
    render(<LoginForm />);
    expect(screen.getByRole('link', { name: 'فراموشی رمز؟' })).toHaveAttribute('href', '/forgot');
    expect(screen.getByRole('link', { name: 'ثبت‌نام رایگان' })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});
