import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  push: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('sonner', () => ({ toast: m.toast }));

import { ForgotForm } from '../components/block/ForgotForm';

const user = userEvent.setup();

beforeEach(() => {
  m.push.mockReset();
  Object.values(m.toast).forEach((fn) => fn.mockReset());
});

async function goToStep2(id = 'ali@company.ir') {
  await user.type(screen.getByLabelText('ایمیل یا شماره موبایل'), id);
  await user.click(screen.getByRole('button', { name: 'ارسال کد تأیید' }));
}

describe('ForgotForm — مرحله ۱', () => {
  it('فیلد خالی خطا می‌دهد و در مرحله ۱ می‌ماند', async () => {
    render(<ForgotForm />);
    await user.click(screen.getByRole('button', { name: 'ارسال کد تأیید' }));

    expect(screen.getByText('ایمیل یا شماره موبایل را وارد کنید')).toBeInTheDocument();
    expect(screen.queryByText('کد تأیید را وارد کنید')).not.toBeInTheDocument();
  });

  it('مقدار نامعتبر رد می‌شود', async () => {
    render(<ForgotForm />);
    await goToStep2('hello');
    expect(screen.getByText('ایمیل یا شماره موبایل معتبر وارد کنید')).toBeInTheDocument();
  });

  it('موبایل با ارقام فارسی به انگلیسی نرمال و پذیرفته می‌شود', async () => {
    render(<ForgotForm />);
    await goToStep2('۰۹۱۲۳۴۵۶۷۸۹');
    expect(screen.getByText('کد تأیید را وارد کنید')).toBeInTheDocument();
    expect(screen.getByText(/09123456789/)).toBeInTheDocument();
  });

  it('شناسه‌ی معتبر toast شبیه‌سازی می‌دهد و به مرحله ۲ می‌رود', async () => {
    render(<ForgotForm />);
    await goToStep2();

    expect(m.toast.success).toHaveBeenCalledWith('کد ارسال شد (شبیه‌سازی)');
    expect(screen.getByText('کد تأیید را وارد کنید')).toBeInTheDocument();
  });
});

describe('ForgotForm — مرحله ۲', () => {
  it('کد ناقص و رمز کوتاه خطا می‌دهند', async () => {
    render(<ForgotForm />);
    await goToStep2();
    await user.type(screen.getByLabelText('رمز عبور جدید'), '123');
    await user.click(screen.getByRole('button', { name: 'تغییر رمز عبور' }));

    expect(screen.getByText('کد ۶ رقمی را کامل وارد کنید.')).toBeInTheDocument();
    expect(screen.getByText('رمز عبور باید حداقل ۱۲ کاراکتر باشد')).toBeInTheDocument();
    expect(m.push).not.toHaveBeenCalled();
  });

  it('ارسال مجدد toast می‌دهد', async () => {
    render(<ForgotForm />);
    await goToStep2();
    m.toast.success.mockClear();
    await user.click(screen.getByRole('button', { name: 'ارسال مجدد' }));

    expect(m.toast.success).toHaveBeenCalledWith('کد ارسال شد (شبیه‌سازی)');
  });

  it('کد و رمز معتبر: toast موفقیت و ریدایرکت به /login', async () => {
    render(<ForgotForm />);
    await goToStep2();
    await user.type(screen.getByLabelText('کد تأیید ۶ رقمی'), '۱۲۳۴۵۶');
    await user.type(screen.getByLabelText('رمز عبور جدید'), 'a-long-password-1');
    await user.click(screen.getByRole('button', { name: 'تغییر رمز عبور' }));

    expect(m.toast.success).toHaveBeenCalledWith('رمز عبور تغییر کرد. وارد شوید.');
    await waitFor(() => expect(m.push).toHaveBeenCalledWith('/login'), { timeout: 3000 });
  });
});
