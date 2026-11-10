import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NewJournalPage } from '../components/block/NewJournalPage';
import { resetJournalStore } from '../lib/journal-api';
import { formatMoneyAmount } from '../utils/journal-formatters';

const nav = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => '/journal/new',
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  resetJournalStore();
  nav.push.mockClear();
});

describe('NewJournalPage', () => {
  it('renders page header and initial 2 lines', () => {
    render(<NewJournalPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'ثبت سند مرکب' })).toBeInTheDocument();
    expect(screen.getByLabelText('تاریخ سند')).toBeInTheDocument();
    expect(screen.getByLabelText('شماره سند')).toBeInTheDocument();
    expect(screen.getByLabelText('شرح سند')).toBeInTheDocument();

    expect(screen.getByRole('table', { name: 'ردیف‌های سند' })).toBeInTheDocument();
    expect(screen.getByLabelText('حساب ردیف ۱')).toBeInTheDocument();
    expect(screen.getByLabelText('حساب ردیف ۲')).toBeInTheDocument();

    // Delete buttons disabled initially because only 2 lines
    expect(screen.getByRole('button', { name: 'حذف ردیف ۱' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'حذف ردیف ۲' })).toBeDisabled();
  });

  it('adds a line and enables deletion', async () => {
    const user = userEvent.setup();
    render(<NewJournalPage />);

    const addButton = screen.getByRole('button', { name: /ردیف جدید/ });
    await user.click(addButton);

    expect(screen.getByLabelText('حساب ردیف ۳')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حذف ردیف ۱' })).not.toBeDisabled();

    // Click delete on row 3
    await user.click(screen.getByRole('button', { name: 'حذف ردیف ۳' }));
    expect(screen.queryByLabelText('حساب ردیف ۳')).not.toBeInTheDocument();
  });

  it('enforces mutual exclusion between debit and credit inputs on the same row', () => {
    render(<NewJournalPage />);

    const debitInput = screen.getByLabelText('بدهکار ردیف ۱');
    const creditInput = screen.getByLabelText('بستانکار ردیف ۱');

    fireEvent.change(debitInput, { target: { value: '50000000' } });
    expect(debitInput).toHaveValue(formatMoneyAmount('50000000'));
    expect(creditInput).toHaveValue('');

    fireEvent.change(creditInput, { target: { value: '25000000' } });
    expect(creditInput).toHaveValue(formatMoneyAmount('25000000'));
    expect(debitInput).toHaveValue('');
  });

  it('calculates balance, updates status message, and enables save button only when balanced and description entered', async () => {
    const user = userEvent.setup();
    render(<NewJournalPage />);

    const saveButton = screen.getByRole('button', { name: 'ثبت سند' });
    expect(saveButton).toBeDisabled();

    const debitInput = screen.getByLabelText('بدهکار ردیف ۱');
    const creditInput = screen.getByLabelText('بستانکار ردیف ۲');
    const descInput = screen.getByLabelText('شرح سند');

    // Enter unbalanced amounts
    fireEvent.change(debitInput, { target: { value: '10000000' } });
    fireEvent.change(creditInput, { target: { value: '5000000' } });

    expect(screen.getByTestId('journal-balance-message')).toHaveTextContent('سند تراز نیست');
    expect(saveButton).toBeDisabled();

    // Balance the amounts
    fireEvent.change(creditInput, { target: { value: '10000000' } });

    // Balanced but description missing
    expect(screen.getByTestId('journal-balance-message')).toHaveTextContent('شرح سند را وارد کنید');
    expect(saveButton).toBeDisabled();

    // Enter description
    await user.type(descInput, 'هزینه اجاره دفتر');

    expect(screen.getByTestId('journal-balance-message')).toHaveTextContent('سند تراز است');
    expect(saveButton).not.toBeDisabled();

    // Click save
    await user.click(saveButton);
    expect(nav.push).toHaveBeenCalledWith('/journal');
  });

  it('allows saving draft even when unbalanced', async () => {
    const user = userEvent.setup();
    render(<NewJournalPage />);

    const draftButton = screen.getByRole('button', { name: 'ذخیره پیش‌نویس' });
    await user.click(draftButton);

    expect(nav.push).toHaveBeenCalledWith('/journal');
  });
});
