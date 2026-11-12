import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ReportsPage } from '../components/block/ReportsPage';

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: mockToast }));

beforeEach(() => {
  mockToast.mockClear();
});

describe('ReportsPage', () => {
  it('renders the page title and description', () => {
    render(<ReportsPage />);
    expect(screen.getByText('گزارش‌ها')).toBeInTheDocument();
    expect(screen.getByText('گزارش‌های مالی، خزانه‌داری، فروش و مدیریتی')).toBeInTheDocument();
  });

  it('renders all four report groups', () => {
    render(<ReportsPage />);
    expect(screen.getByText('گزارشات مالی')).toBeInTheDocument();
    expect(screen.getByText('خزانه‌داری')).toBeInTheDocument();
    expect(screen.getByText('فروش و خرید')).toBeInTheDocument();
    expect(screen.getByText('مدیریتی')).toBeInTheDocument();
  });

  it('renders report items under each group', () => {
    render(<ReportsPage />);
    expect(screen.getByText('ترازنامه')).toBeInTheDocument();
    expect(screen.getByText('صورت سود و زیان')).toBeInTheDocument();
    expect(screen.getByText('موجودی بانک‌ها')).toBeInTheDocument();
    expect(screen.getByText('فروش روزانه')).toBeInTheDocument();
    expect(screen.getByText('عملکرد شعب')).toBeInTheDocument();
  });

  it('renders "باز کردن" span next to each report item', () => {
    render(<ReportsPage />);
    const bazKon = screen.getAllByText('باز کردن');
    expect(bazKon.length).toBeGreaterThan(0);
    bazKon.forEach((el) => {
      expect(el).toHaveClass('text-muted-foreground');
    });
  });

  it('opens the report dialog when a report item is clicked', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    expect(screen.getByText('از تاریخ')).toBeInTheDocument();
    expect(screen.getByText('تا تاریخ')).toBeInTheDocument();
    expect(screen.getByText('شعبه')).toBeInTheDocument();
    expect(screen.getByText('وضعیت')).toBeInTheDocument();
  });

  it('dialog contains branch and status selects', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    expect(screen.getByText('همه شعب')).toBeInTheDocument();
    expect(screen.getByText('همه')).toBeInTheDocument();
  });

  it('dialog contains four action buttons', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    expect(screen.getByRole('button', { name: /بستن/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Excel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /نمایش گزارش/ })).toBeInTheDocument();
  });

  it('closes the dialog when بستن is clicked', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    expect(screen.getByText('از تاریخ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /بستن/ }));
    expect(screen.queryByText('از تاریخ')).not.toBeInTheDocument();
  });

  it('confirms a date range via نمایش گزارش button', async () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));

    const fromInput = screen.getByPlaceholderText('۱۴۰۵/۰۱/۰۱');
    const toInput = screen.getByPlaceholderText('۱۴۰۵/۱۲/۲۹');

    fireEvent.change(fromInput, { target: { value: '1405/01/01' } });
    fireEvent.change(toInput, { target: { value: '1405/01/15' } });

    fireEvent.click(screen.getByRole('button', { name: /نمایش گزارش/ }));

    await waitFor(() => {
      expect(screen.queryByText('از تاریخ')).not.toBeInTheDocument();
    });
  });

  it('shows toast when Excel button is clicked', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    fireEvent.click(screen.getByRole('button', { name: /Excel/ }));

    expect(mockToast).toHaveBeenCalledWith('نسخه نمایشی: گزارش به بک‌اند وصل می‌شود');
  });

  it('shows toast when PDF button is clicked', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    fireEvent.click(screen.getByRole('button', { name: /PDF/ }));

    expect(mockToast).toHaveBeenCalledWith('نسخه نمایشی: گزارش به بک‌اند وصل می‌شود');
  });

  it('shows toast when نمایش گزارش button is clicked', async () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    fireEvent.click(screen.getByRole('button', { name: /نمایش گزارش/ }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('نسخه نمایشی: گزارش به بک‌اند وصل می‌شود');
    });
  });

  it('does NOT show toast when بستن button is clicked', () => {
    render(<ReportsPage />);
    fireEvent.click(screen.getByRole('button', { name: /ترازنامه/ }));
    fireEvent.click(screen.getByRole('button', { name: /بستن/ }));

    expect(mockToast).not.toHaveBeenCalled();
  });
});
