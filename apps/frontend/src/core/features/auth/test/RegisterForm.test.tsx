import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInApi: vi.fn(),
  signUpApi: vi.fn(),
  setAuthToken: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push, refresh: m.refresh }) }));
vi.mock('sonner', () => ({ toast: m.toast }));
vi.mock('../lib/auth-api', () => ({ signInApi: m.signInApi, signUpApi: m.signUpApi }));
vi.mock('../lib/auth-storage', () => ({ setAuthToken: m.setAuthToken }));

import { RegisterForm } from '../components/block/RegisterForm';

const PASSWORD = 'a-long-password-1';
const session = { token: 'tok', tokenType: 'Bearer', expiresAt: 'e', principal: {} };
const user = userEvent.setup();
const submitButton = () => screen.getByRole('button', { name: /ساخت حساب|در حال ثبت‌نام/ });

async function fill(
  v: Partial<{ name: string; email: string; password: string; password2: string }> = {},
) {
  const {
    name = 'علی رضایی',
    email = 'ali@company.ir',
    password = PASSWORD,
    password2 = password,
  } = v;
  await user.type(screen.getByLabelText('نام نمایشی'), name);
  await user.type(screen.getByLabelText('ایمیل'), email);
  await user.type(screen.getByLabelText('رمز عبور'), password);
  await user.type(screen.getByLabelText('تکرار رمز عبور'), password2);
}

beforeEach(() => {
  [m.push, m.refresh, m.signInApi, m.signUpApi, m.setAuthToken].forEach((fn) => fn.mockReset());
  Object.values(m.toast).forEach((fn) => fn.mockReset());
  m.setAuthToken.mockResolvedValue(undefined);
});

describe('RegisterForm — اعتبارسنجی', () => {
  it('فرم خالی همه‌ی خطاها را نشان می‌دهد و درخواستی نمی‌فرستد', async () => {
    render(<RegisterForm />);
    await user.click(submitButton());

    expect(screen.getByText('نام نمایشی را وارد کنید')).toBeInTheDocument();
    expect(screen.getByText('ایمیل را وارد کنید')).toBeInTheDocument();
    expect(screen.getByText('رمز عبور را وارد کنید')).toBeInTheDocument();
    expect(screen.getByText('تکرار رمز عبور را وارد کنید')).toBeInTheDocument();
    expect(m.signUpApi).not.toHaveBeenCalled();
  });

  it('رمز ۱۱ کاراکتری (کمتر از سیاست بک‌اند) رد می‌شود', async () => {
    render(<RegisterForm />);
    await fill({ password: '1'.repeat(11) });
    await user.click(submitButton());

    expect(screen.getByText('رمز عبور باید حداقل ۱۲ کاراکتر باشد')).toBeInTheDocument();
    expect(m.signUpApi).not.toHaveBeenCalled();
  });

  it('تکرار رمز ناهمسان رد می‌شود', async () => {
    render(<RegisterForm />);
    await fill({ password2: 'different-password' });
    await user.click(submitButton());

    expect(screen.getByText('رمز عبور و تکرار آن یکسان نیستند')).toBeInTheDocument();
    expect(m.signUpApi).not.toHaveBeenCalled();
  });
});

describe('RegisterForm — ثبت‌نام', () => {
  it('فقط displayName/email/password را می‌فرستد (بدون password2)', async () => {
    m.signUpApi.mockResolvedValue({ id: '1' });
    m.signInApi.mockResolvedValue(session);
    render(<RegisterForm />);
    await fill();
    await user.click(submitButton());

    await waitFor(() => expect(m.signUpApi).toHaveBeenCalled());
    expect(m.signUpApi).toHaveBeenCalledWith({
      displayName: 'علی رضایی',
      email: 'ali@company.ir',
      password: PASSWORD,
    });
  });

  it('بعد از موفقیت وارد می‌شود و به / می‌رود', async () => {
    m.signUpApi.mockResolvedValue({ id: '1' });
    m.signInApi.mockResolvedValue(session);
    render(<RegisterForm />);
    await fill();
    await user.click(submitButton());

    await waitFor(() => expect(m.push).toHaveBeenCalledWith('/'));
    expect(m.signInApi).toHaveBeenCalledWith({ email: 'ali@company.ir', password: PASSWORD });
    expect(m.setAuthToken).toHaveBeenCalledWith('tok', 'e', false);
  });

  it('اگر ورود خودکار شکست بخورد، ثبت‌نام موفق حساب می‌شود و به /login می‌رود', async () => {
    m.signUpApi.mockResolvedValue({ id: '1' });
    m.signInApi.mockRejectedValue(new TypeError('fetch failed'));
    render(<RegisterForm />);
    await fill();
    await user.click(submitButton());

    await waitFor(() => expect(m.push).toHaveBeenCalledWith('/login'));
    expect(m.toast.success).toHaveBeenCalled();
    expect(m.toast.error).not.toHaveBeenCalled();
  });

  it('409: خطا زیر فیلد ایمیل، toast، بدون ریدایرکت و دکمه دوباره فعال', async () => {
    m.signUpApi.mockRejectedValue({ status: 409, body: null });
    render(<RegisterForm />);
    await fill();
    await user.click(submitButton());

    expect(await screen.findAllByText('این ایمیل قبلاً ثبت شده است.')).not.toHaveLength(0);
    expect(m.toast.error).toHaveBeenCalledWith('این ایمیل قبلاً ثبت شده است.');
    expect(m.push).not.toHaveBeenCalled();
    expect(m.signInApi).not.toHaveBeenCalled();
    expect(submitButton()).toBeEnabled();
  });

  it('400 با details فیلد را زیر همان فیلد نشان می‌دهد', async () => {
    m.signUpApi.mockRejectedValue({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          category: 'validation',
          message: 'x',
          correlationId: 'c',
          details: [{ field: 'displayName', code: 'maxLength', message: 'too long' }],
        },
      },
    });
    render(<RegisterForm />);
    await fill();
    await user.click(submitButton());

    expect(await screen.findByText('مقدار واردشده معتبر نیست.')).toBeInTheDocument();
  });

  it('حین ارسال دکمه غیرفعال و متن «در حال ثبت‌نام...» است', async () => {
    m.signUpApi.mockReturnValue(new Promise(() => {}));
    render(<RegisterForm />);
    await fill();
    await user.click(submitButton());

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(submitButton()).toHaveTextContent('در حال ثبت‌نام...');
    expect(m.signUpApi).toHaveBeenCalledTimes(1);
  });
});
