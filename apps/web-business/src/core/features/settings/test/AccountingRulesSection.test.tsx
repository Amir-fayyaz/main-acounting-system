import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { AccountingRules } from '../assets/@types/settings';
import { AccountingRulesSection } from '../components/block/sections/AccountingRulesSection';

const RULES: AccountingRules = {
  autoNumbering: true,
  balanceControl: true,
  autoInvoiceJournal: true,
  preventDuplicateTransactions: true,
};

describe('AccountingRulesSection', () => {
  it('emits the toggled rule when its checkbox is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<AccountingRulesSection value={RULES} onChange={onChange} disabled={false} />);

    await user.click(screen.getByRole('checkbox', { name: 'شماره‌گذاری خودکار اسناد' }));

    expect(onChange).toHaveBeenCalledWith({ autoNumbering: false });
  });

  it('toggles when the row label is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<AccountingRulesSection value={RULES} onChange={onChange} disabled={false} />);

    await user.click(screen.getByText('ایجاد خودکار سند برای فاکتور'));

    expect(onChange).toHaveBeenCalledWith({ autoInvoiceJournal: false });
  });

  it('keeps the locked balance-control rule disabled', () => {
    render(<AccountingRulesSection value={RULES} onChange={vi.fn()} disabled={false} />);

    expect(
      screen.getByRole('checkbox', { name: 'کنترل توازن بدهکار و بستانکار' }),
    ).toBeDisabled();
  });
});
