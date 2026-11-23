import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FiscalYearsPage } from '../components/block/FiscalYearsPage';
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

describe('FiscalYearsPage', () => {
  it('renders header, stats, and fiscal years table', async () => {
    render(<FiscalYearsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'سال‌های مالی' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /سال مالی جدید/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('تعداد سال‌های مالی')).toBeInTheDocument();
      expect(screen.getByText('سال مالی جاری')).toBeInTheDocument();
      expect(screen.getByText('کل دوره‌های مالی')).toBeInTheDocument();
      expect(screen.getByRole('table', { name: 'سال‌های مالی' })).toBeInTheDocument();
      expect(screen.getAllByText('سال مالی ۱۴۰۵').length).toBeGreaterThan(0);
      expect(screen.getByText('سال مالی ۱۴۰۴')).toBeInTheDocument();
    });
  });

  it('renders links to periods for each year', async () => {
    render(<FiscalYearsPage />);

    await waitFor(() => {
      const periodLinks = screen.getAllByRole('link', { name: 'دوره‌ها' });
      expect(periodLinks.length).toBeGreaterThan(0);
      expect(periodLinks[0]).toHaveAttribute(
        'href',
        expect.stringContaining('/fiscal-periods?year='),
      );
    });
  });

  it('opens new year dialog and creates a year', async () => {
    const user = userEvent.setup();
    render(<FiscalYearsPage />);

    const newBtn = screen.getByRole('button', { name: /سال مالی جدید/ });
    await user.click(newBtn);

    // Dialog appears
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'سال مالی جدید' })).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/عنوان سال مالی/);
    await user.clear(titleInput);
    await user.type(titleInput, 'سال مالی ۱۴۰۷');

    const submitBtn = screen.getByRole('button', { name: 'ایجاد سال مالی' });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getAllByText('سال مالی ۱۴۰۷').length).toBeGreaterThan(0);
    });
  });

  it('validates duplicate titles in dialog', async () => {
    const user = userEvent.setup();
    render(<FiscalYearsPage />);

    const newBtn = screen.getByRole('button', { name: /سال مالی جدید/ });
    await user.click(newBtn);

    const titleInput = screen.getByLabelText(/عنوان سال مالی/);
    await user.clear(titleInput);
    await user.type(titleInput, 'سال مالی ۱۴۰۵'); // already exists

    const submitBtn = screen.getByRole('button', { name: 'ایجاد سال مالی' });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/عنوان سال مالی تکراری است/)).toBeInTheDocument();
  });
});
