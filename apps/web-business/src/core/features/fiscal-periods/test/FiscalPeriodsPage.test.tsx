import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FiscalPeriod, FiscalYear } from '../assets/@types';
import { FiscalPeriodsPage } from '../components/block/FiscalPeriodsPage';
import {
  closeFiscalPeriodAction,
  loadFiscalPeriodsAction,
  loadFiscalYearsAction,
  reopenFiscalPeriodAction,
} from '../lib/fiscal-periods.actions';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../lib/fiscal-periods.actions', () => ({
  loadFiscalYearsAction: vi.fn(),
  loadFiscalPeriodsAction: vi.fn(),
  closeFiscalPeriodAction: vi.fn(),
  reopenFiscalPeriodAction: vi.fn(),
}));

const YEARS: FiscalYear[] = [
  { id: 'year-1405', title: 'سال مالی ۱۴۰۵', from: '۱۴۰۵/۰۱/۰۱', to: '۱۴۰۵/۱۲/۲۹' },
];

const PERIODS: FiscalPeriod[] = [
  {
    id: 'period-1405-01',
    yid: 'year-1405',
    name: 'فروردین ۱۴۰۵',
    from: '۱۴۰۵/۰۱/۰۱',
    to: '۱۴۰۵/۰۱/۳۱',
    status: 'closed',
  },
  {
    id: 'period-1405-02',
    yid: 'year-1405',
    name: 'اردیبهشت ۱۴۰۵',
    from: '۱۴۰۵/۰۲/۰۱',
    to: '۱۴۰۵/۰۲/۳۱',
    status: 'open',
  },
];

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(loadFiscalYearsAction).mockResolvedValue({ ok: true, years: YEARS });
  vi.mocked(loadFiscalPeriodsAction).mockResolvedValue({
    ok: true,
    periods: PERIODS,
    stats: { openCount: 1, closedCount: 1, totalCount: 2 },
  });
});

describe('FiscalPeriodsPage', () => {
  it('renders the period list and stats loaded from the API', async () => {
    render(<FiscalPeriodsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'دوره‌های مالی' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('فروردین ۱۴۰۵')).toBeInTheDocument();
    });

    expect(screen.getByText('اردیبهشت ۱۴۰۵')).toBeInTheDocument();
    expect(screen.getByText('دوره‌های باز')).toBeInTheDocument();
    expect(screen.getByText('دوره‌های بسته')).toBeInTheDocument();
    expect(loadFiscalPeriodsAction).toHaveBeenCalledWith('year-1405');
  });

  it('closes an open period through the API action', async () => {
    const user = userEvent.setup();
    vi.mocked(closeFiscalPeriodAction).mockResolvedValue({
      ok: true,
      period: { ...PERIODS[1], status: 'closed' },
    });

    render(<FiscalPeriodsPage />);

    await waitFor(() => {
      expect(screen.getByText('اردیبهشت ۱۴۰۵')).toBeInTheDocument();
    });

    const row = screen.getByText('اردیبهشت ۱۴۰۵').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'بستن دوره' }));

    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'بستن دوره' });
    expect(confirmButton).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(confirmButton);

    await waitFor(() => {
      expect(closeFiscalPeriodAction).toHaveBeenCalledWith('period-1405-02');
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('reopens a closed period with a reason', async () => {
    const user = userEvent.setup();
    vi.mocked(reopenFiscalPeriodAction).mockResolvedValue({
      ok: true,
      period: { ...PERIODS[0], status: 'open' },
    });

    render(<FiscalPeriodsPage />);

    await waitFor(() => {
      expect(screen.getByText('فروردین ۱۴۰۵')).toBeInTheDocument();
    });

    const row = screen.getByText('فروردین ۱۴۰۵').closest('tr');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'بازگشایی' }));

    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: 'بازگشایی دوره' });
    expect(confirmButton).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/دلیل بازگشایی/), 'کوتاه');
    await user.click(within(dialog).getByRole('checkbox'));
    expect(confirmButton).toBeDisabled();

    await user.clear(within(dialog).getByLabelText(/دلیل بازگشایی/));
    await user.type(
      within(dialog).getByLabelText(/دلیل بازگشایی/),
      'اصلاح سند هزینه اداری ثبت‌شده اشتباه',
    );
    expect(confirmButton).not.toBeDisabled();

    await user.click(confirmButton);

    await waitFor(() => {
      expect(reopenFiscalPeriodAction).toHaveBeenCalledWith(
        'period-1405-01',
        'اصلاح سند هزینه اداری ثبت‌شده اشتباه',
      );
    });
  });
});
