import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FiscalPeriodsPage } from '../components/block/FiscalPeriodsPage';
import { resetFiscalStore } from '../lib/fiscal-periods-api';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

beforeEach(() => {
  resetFiscalStore();
});

describe('FiscalPeriodsPage', () => {
  it('renders header, KPIs, year selector, and period list', async () => {
    render(<FiscalPeriodsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'دوره‌های مالی' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ایجاد دوره/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('دوره‌های باز')).toBeInTheDocument();
      expect(screen.getByText('دوره‌های بسته')).toBeInTheDocument();
      expect(screen.getByText('کل دوره‌ها')).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'دوره‌های مالی' })).toBeInTheDocument();
      expect(screen.getByText('آبان ۱۴۰۵')).toBeInTheDocument();
    });
  });

  it('allows starting review and closing a period', async () => {
    const user = userEvent.setup();
    render(<FiscalPeriodsPage />);

    await waitFor(() => {
      expect(screen.getByText('آبان ۱۴۰۵')).toBeInTheDocument();
    });

    // Find the row for آبان ۱۴۰۵ and click "بستن دوره"
    const row = screen.getByText('آبان ۱۴۰۵').closest('tr')!;
    const closeBtn = row.querySelector('button:last-child')!;
    await user.click(closeBtn);

    // Dialog appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/بستن دوره‌ی آبان ۱۴۰۵/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'بستن دوره' });
    expect(confirmBtn).toBeDisabled();

    // Check confirmation checkbox
    const checkbox = screen.getByRole('checkbox', { name: /متوجه‌ام و بستن دوره را تأیید می‌کنم/ });
    await user.click(checkbox);
    expect(confirmBtn).not.toBeDisabled();

    // Click confirm close
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('allows reopening a closed period with required reason', async () => {
    const user = userEvent.setup();
    render(<FiscalPeriodsPage />);

    await waitFor(() => {
      expect(screen.getByText('فروردین ۱۴۰۵')).toBeInTheDocument();
    });

    const row = screen.getByText('فروردین ۱۴۰۵').closest('tr')!;
    const reopenBtn = row.querySelector('button')!;
    expect(reopenBtn).toHaveTextContent('بازگشایی');
    await user.click(reopenBtn);

    // Dialog appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/بازگشایی دوره‌ی فروردین ۱۴۰۵/)).toBeInTheDocument();

    const confirmReopenBtn = screen.getByRole('button', { name: 'بازگشایی دوره' });
    expect(confirmReopenBtn).toBeDisabled();

    // Enter short reason (less than 10 characters)
    const reasonInput = screen.getByLabelText(/دلیل بازگشایی/);
    await user.type(reasonInput, 'کوتاه');

    const checkbox = screen.getByRole('checkbox', { name: /پیامدهای بازگشایی را می‌دانم/ });
    await user.click(checkbox);

    // Still disabled because reason is too short
    expect(confirmReopenBtn).toBeDisabled();

    // Enter valid reason (>= 10 characters)
    fireEvent.change(reasonInput, { target: { value: 'اصلاح سند هزینه اداری ثبت‌شده اشتباه' } });
    expect(confirmReopenBtn).not.toBeDisabled();

    // Confirm reopen
    await user.click(confirmReopenBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders audit history card', async () => {
    render(<FiscalPeriodsPage />);

    await waitFor(() => {
      expect(screen.getByText('تاریخچه‌ی قفل و بازگشایی دوره‌ها')).toBeInTheDocument();
      expect(screen.getAllByText(/علی رضایی/).length).toBeGreaterThan(0);
    });
  });
});
