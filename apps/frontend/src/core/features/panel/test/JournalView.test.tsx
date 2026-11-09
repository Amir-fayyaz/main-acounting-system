import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaginatedResponse, PaginationMeta } from '@repo/web';
import type { JournalEntry } from '../assets/@types';
import { JournalView } from '../components/block/journal/JournalView';

const api = vi.hoisted(() => ({
  listJournalEntries: vi.fn(),
  getJournalStats: vi.fn(),
}));
vi.mock('../lib/journal-api', () => api);

const nav = vi.hoisted(() => ({
  pathname: '/panel/journal',
  search: '',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeAll(() => {
  // jsdom does not implement the pointer/scroll APIs used by Radix Select.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 'journal-0001',
    number: '1405024',
    date: '۱۴۰۵/۰۸/۰۵',
    description: 'فروش نقدی',
    amount: '25000000.00',
    currency: 'IRR',
    status: 'balanced',
    ...overrides,
  };
}

function listResponse(
  data: JournalEntry[],
  meta: Partial<PaginationMeta> = {},
): PaginatedResponse<JournalEntry> {
  return {
    data,
    meta: {
      page: 1,
      limit: 10,
      total: data.length,
      totalPages: data.length > 0 ? 1 : 0,
      ...meta,
    },
  };
}

const SECOND_ENTRY = entry({
  id: 'journal-0002',
  number: '1405023',
  description: 'پرداخت اجاره',
  amount: '84000000.00',
  status: 'draft',
});

const STATS = { count: 24, totalAmount: '1680000000.00', draftCount: 4 };

beforeEach(() => {
  api.listJournalEntries.mockReset();
  api.getJournalStats.mockReset();
  api.listJournalEntries.mockResolvedValue(listResponse([entry(), SECOND_ENTRY]));
  api.getJournalStats.mockResolvedValue(STATS);
  nav.pathname = '/panel/journal';
  nav.search = '';
  nav.replace.mockReset();
});

describe('JournalView', () => {
  it('renders the header, actions, columns and formatted rows without row actions', async () => {
    render(<JournalView />);

    expect(screen.getByRole('heading', { level: 1, name: 'دفتر روزنامه' })).toBeInTheDocument();
    expect(screen.getByText('همه اسناد ثبت‌شده به ترتیب تاریخ')).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: 'ثبت سند مرکب' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'چاپ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'چاپ' })).toBeInTheDocument();

    expect(await screen.findByText('۱۴۰۵۰۲۴')).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'دفتر روزنامه' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['شماره سند', 'تاریخ', 'شرح', 'مبلغ (ریال)', 'وضعیت']);

    expect(within(table).getByText('۲۵٬۰۰۰٬۰۰۰')).toBeInTheDocument();
    expect(within(table).getByText('۸۴٬۰۰۰٬۰۰۰')).toBeInTheDocument();
    expect(within(table).getByText('تراز')).toBeInTheDocument();
    expect(within(table).getByText('پیش‌نویس')).toBeInTheDocument();

    // Prototype journal rows carry no per-row actions.
    expect(within(table).queryByRole('button')).not.toBeInTheDocument();
    expect(within(table).queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the statistics row from the stats aggregate', async () => {
    render(<JournalView />);

    const stats = await screen.findByLabelText('آمار فهرست');
    expect(within(stats).getByText('تعداد اسناد')).toBeInTheDocument();
    expect(within(stats).getByText('۲۴')).toBeInTheDocument();
    expect(within(stats).getByText('جمع مبالغ')).toBeInTheDocument();
    expect(within(stats).getByText('۱٬۶۸۰٬۰۰۰٬۰۰۰ ریال')).toBeInTheDocument();
    expect(within(stats).getByText('پیش‌نویس')).toBeInTheDocument();
    expect(within(stats).getByText('۴')).toBeInTheDocument();
  });

  it('sends the URL list params to the API and scopes stats to search/status', async () => {
    nav.search = `page=2&limit=20&search=${encodeURIComponent('خرید')}&status=draft`;

    render(<JournalView />);

    await waitFor(() =>
      expect(api.listJournalEntries).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        search: 'خرید',
        status: 'draft',
      }),
    );
    await waitFor(() =>
      expect(api.getJournalStats).toHaveBeenCalledWith({ search: 'خرید', status: 'draft' }),
    );
  });

  it('commits search to the URL (resetting page) and refetches when the term changes', async () => {
    nav.search = 'page=3';
    const user = userEvent.setup();
    const { rerender } = render(<JournalView />);

    await user.type(screen.getByPlaceholderText('جستجو در جدول…'), 'پرداخت');

    const expected = new URLSearchParams('page=3');
    expected.set('search', 'پرداخت');
    expected.set('page', '1');
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith(`/panel/journal?${expected.toString()}`),
    );

    nav.search = expected.toString();
    rerender(<JournalView />);

    await waitFor(() =>
      expect(api.listJournalEntries).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'پرداخت', page: 1 }),
      ),
    );
    expect(api.getJournalStats).toHaveBeenCalledWith({ search: 'پرداخت', status: '' });
  });

  it('filters by status through the URL and refetches list and stats', async () => {
    nav.search = 'page=3';
    const user = userEvent.setup();
    const { rerender } = render(<JournalView />);

    await user.click(screen.getByRole('combobox', { name: 'وضعیت' }));
    await user.click(screen.getByRole('option', { name: 'تراز' }));

    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/panel/journal?status=balanced'));

    nav.search = 'status=balanced';
    rerender(<JournalView />);

    await waitFor(() =>
      expect(api.listJournalEntries).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'balanced' }),
      ),
    );
    expect(api.getJournalStats).toHaveBeenCalledWith({ search: '', status: 'balanced' });
    expect(screen.getByRole('combobox', { name: 'وضعیت' })).toHaveTextContent('تراز');
    expect(await within(screen.getByRole('table')).findByText('تراز')).toBeInTheDocument();
  });

  it('paginates through the URL using the server metadata', async () => {
    api.listJournalEntries.mockResolvedValue(
      listResponse([entry()], { page: 1, limit: 10, total: 25, totalPages: 3 }),
    );
    const user = userEvent.setup();
    const { rerender } = render(<JournalView />);

    await screen.findByText('۱۴۰۵۰۲۴');
    expect(screen.getByText('۲۵ مورد')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Go to next page' }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/panel/journal?page=2'));

    nav.search = 'page=2';
    rerender(<JournalView />);

    await waitFor(() =>
      expect(api.listJournalEntries).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it('shows loading states for the table and the statistics while requests are pending', () => {
    api.listJournalEntries.mockReturnValue(new Promise(() => {}));
    api.getJournalStats.mockReturnValue(new Promise(() => {}));

    render(<JournalView />);

    expect(within(screen.getByRole('table')).getByRole('status')).toHaveTextContent(
      'در حال بارگذاری…',
    );
    expect(screen.getByRole('status', { name: 'در حال بارگذاری آمار' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();
  });

  it('renders the prototype empty state when nothing matches', async () => {
    api.listJournalEntries.mockResolvedValue(listResponse([]));

    render(<JournalView />);

    expect(await screen.findByText('هنوز موردی ثبت نشده است.')).toBeInTheDocument();
  });

  it('renders the search-specific empty state message', async () => {
    nav.search = 'search=پرداخت';
    api.listJournalEntries.mockResolvedValue(listResponse([]));

    render(<JournalView />);

    expect(
      await screen.findByText('نتیجه‌ای برای «پرداخت» پیدا نشد. عبارت دیگری را جستجو کنید.'),
    ).toBeInTheDocument();
  });

  it('renders error alerts for the table and the statistics', async () => {
    api.listJournalEntries.mockRejectedValue(new Error('list failed'));
    api.getJournalStats.mockRejectedValue(new Error('stats failed'));

    render(<JournalView />);

    expect(
      await screen.findByText('دریافت اسناد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('دریافت آمار با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();
  });

  it('prints through the browser print dialog', async () => {
    const printMock = vi.fn();
    Object.defineProperty(window, 'print', {
      value: printMock,
      configurable: true,
      writable: true,
    });
    const user = userEvent.setup();
    render(<JournalView />);

    await screen.findByText('۱۴۰۵۰۲۴');
    await user.click(screen.getByRole('button', { name: 'چاپ' }));

    expect(printMock).toHaveBeenCalledTimes(1);
  });
});
