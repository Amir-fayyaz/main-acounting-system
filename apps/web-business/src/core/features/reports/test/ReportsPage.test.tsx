import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReportsPage } from '../components/block/ReportsPage';

describe('ReportsPage', () => {
  it('renders the page title and description', () => {
    render(<ReportsPage />);
    expect(screen.getByText('گزارش‌ها')).toBeInTheDocument();
    expect(screen.getByText('گروه‌های گزارش قابل دسترسی در پنل کسب‌وکار')).toBeInTheDocument();
  });

  it('renders all four report groups', () => {
    render(<ReportsPage />);
    expect(screen.getByText('گزارش‌های مالی')).toBeInTheDocument();
    expect(screen.getByText('گزارش‌های خزانه')).toBeInTheDocument();
    expect(screen.getByText('گزارش‌های فروش')).toBeInTheDocument();
    expect(screen.getByText('گزارش‌های مدیریت')).toBeInTheDocument();
  });

  it('opens the date range dialog when the button is clicked', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /انتخاب بازه تاریخ/ }));
    expect(screen.getByText('بازه تاریخ گزارش')).toBeInTheDocument();
    expect(screen.getByText('از تاریخ')).toBeInTheDocument();
    expect(screen.getByText('تا تاریخ')).toBeInTheDocument();
  });

  it('confirms a date range and displays it', async () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /انتخاب بازه تاریخ/ }));

    const fromInput = screen.getByPlaceholderText('۱۴۰۵/۰۱/۰۱');
    const toInput = screen.getByPlaceholderText('۱۴۰۵/۱۲/۲۹');

    fireEvent.change(fromInput, { target: { value: '1405/01/01' } });
    fireEvent.change(toInput, { target: { value: '1405/01/15' } });

    fireEvent.click(screen.getByRole('button', { name: /اعمال/ }));

    await waitFor(() => {
      expect(screen.getByText('بازه elect شده: 1405/01/01 تا 1405/01/15')).toBeInTheDocument();
    });
  });

  it('closes the dialog when cancel is clicked', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /انتخاب بازه تاریخ/ }));
    expect(screen.getByText('بازه تاریخ گزارش')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /انصراف/ }));
    expect(screen.queryByText('بازه تاریخ گزارش')).not.toBeInTheDocument();
  });
});
