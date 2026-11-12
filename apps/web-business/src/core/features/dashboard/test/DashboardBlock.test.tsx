import { existsSync } from 'node:fs';
import path from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PaginatedResponse } from '@repo/web';
import type { Cheque, Invoice } from '../../panel/assets/@types';
import { createMockDashboardSnapshot } from '../assets/mock/dashboard';
import { DashboardBlock } from '../components/block/DashboardBlock';

const api = vi.hoisted(() => ({
  getDashboardSnapshot: vi.fn(),
  listInvoices: vi.fn(),
  listCheques: vi.fn(),
}));
vi.mock('../lib/dashboard-api', () => ({ getDashboardSnapshot: api.getDashboardSnapshot }));
vi.mock('../../panel/lib/invoices-api', () => ({ listInvoices: api.listInvoices }));
vi.mock('../../panel/lib/cheques-api', () => ({ listCheques: api.listCheques }));

const PANEL_ROUTES_DIR = path.join(process.cwd(), 'src/app/(panel)');

function paginated<T>(data: T[], limit = 20): PaginatedResponse<T> {
  return {
    data,
    meta: { page: 1, limit, total: data.length, totalPages: data.length > 0 ? 1 : 0 },
  };
}

function cardOf(element: Element): HTMLElement {
  const card = element.closest('[data-slot="card"]');
  if (!card) throw new Error('expected the element to live inside a card');
  return card as HTMLElement;
}

function mockSuccess({
  invoices = [] as Invoice[],
  cheques = [] as Cheque[],
}: { invoices?: Invoice[]; cheques?: Cheque[] } = {}) {
  api.getDashboardSnapshot.mockResolvedValue(createMockDashboardSnapshot());
  api.listInvoices.mockResolvedValue(paginated(invoices, 5));
  api.listCheques.mockResolvedValue(paginated(cheques));
}

const METRIC_LABELS = [
  'موجودی حساب‌های بانکی',
  'موجودی صندوق‌ها',
  'دریافت‌های امروز',
  'پرداخت‌های امروز',
  'فروش امروز',
  'خرید امروز',
  'سود خالص ماه',
  'مطالبات از مشتریان',
];

beforeEach(() => {
  api.getDashboardSnapshot.mockReset();
  api.listInvoices.mockReset();
  api.listCheques.mockReset();
});

describe('DashboardBlock', () => {
  it('shows the loading skeleton while the dashboard requests are pending', () => {
    api.getDashboardSnapshot.mockReturnValue(new Promise(() => {}));
    api.listInvoices.mockReturnValue(new Promise(() => {}));
    api.listCheques.mockReturnValue(new Promise(() => {}));

    render(<DashboardBlock />);

    expect(screen.getByLabelText('در حال بارگذاری داشبورد')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders an alert when the dashboard requests fail', async () => {
    api.getDashboardSnapshot.mockRejectedValue(new Error('snapshot failed'));
    api.listInvoices.mockRejectedValue(new Error('invoices failed'));
    api.listCheques.mockRejectedValue(new Error('cheques failed'));

    render(<DashboardBlock />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'دریافت اطلاعات داشبورد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
    );
  });

  it('renders all 8 metrics with short Persian money values', async () => {
    mockSuccess();

    render(<DashboardBlock />);

    const section = await screen.findByLabelText('شاخص‌های مالی');
    for (const label of METRIC_LABELS) {
      expect(within(section).getByText(label)).toBeInTheDocument();
    }
    expect(within(section).getAllByText('میلیارد ریال')).toHaveLength(4);
    expect(within(section).getAllByText('میلیون ریال')).toHaveLength(4);
    expect(within(section).getByText('۴۸٫۲')).toBeInTheDocument();
    expect(within(section).getByText('۶۱۲')).toBeInTheDocument();
    expect(within(section).queryByText('۴۸٬۲۰۰٬۰۰۰٬۰۰۰')).not.toBeInTheDocument();
    expect(within(section).queryByText(/\d{1,3},\d{3}/)).not.toBeInTheDocument();
  });

  it('highlights the prototype accent metrics and tones the hint lines', async () => {
    mockSuccess();

    render(<DashboardBlock />);

    const section = await screen.findByLabelText('شاخص‌های مالی');
    for (const label of ['فروش امروز', 'سود خالص ماه']) {
      const card = within(section).getByText(label).closest('[data-slot="card"]');
      expect(card).toHaveClass('bg-accent');
    }
    const plainCard = within(section).getByText('خرید امروز').closest('[data-slot="card"]');
    expect(plainCard).not.toHaveClass('bg-accent');
    expect(within(section).getByText('۱۸ تراکنش')).toHaveClass('text-success');
    expect(within(section).getByText('۹ تراکنش')).toHaveClass('text-destructive');
    expect(screen.queryByText('۳ صندوق فعال')).not.toBeInTheDocument();
  });

  it('renders the cashflow bar chart and payment donut from the prototype', async () => {
    mockSuccess();

    render(<DashboardBlock />);

    const chart = await screen.findByRole('img', { name: 'نمودار درآمد و هزینه شش ماه اخیر' });
    expect(screen.getByRole('img', { name: 'سهم روش‌های پرداخت' })).toBeInTheDocument();
    expect(within(cardOf(chart)).getByText('درآمد')).toBeInTheDocument();
    expect(within(cardOf(chart)).getByText('هزینه')).toBeInTheDocument();
    expect(within(cardOf(chart)).getByText('میلیارد ریال')).toBeInTheDocument();
    expect(screen.getByText('نقد')).toBeInTheDocument();
    expect(screen.getByText('۳۴٪')).toBeInTheDocument();
    expect(screen.getByText('حواله')).toBeInTheDocument();
  });

  it('renders the invoices, cheques and tasks summary cards', async () => {
    const snapshot = createMockDashboardSnapshot();
    mockSuccess({ invoices: [], cheques: [] });
    api.getDashboardSnapshot.mockResolvedValue(snapshot);

    render(<DashboardBlock />);

    expect(await screen.findByText('آخرین فاکتورها')).toBeInTheDocument();
    expect(screen.getByText('چک‌های نزدیک سررسید')).toBeInTheDocument();
    expect(screen.getByText('تسک‌های من')).toBeInTheDocument();
    for (const task of snapshot.tasks) {
      expect(screen.getByText(task.title)).toBeInTheDocument();
      expect(screen.getByText(task.due)).toBeInTheDocument();
    }
  });

  it('lists recent invoices with compact million-scale amounts', async () => {
    const invoices: Invoice[] = [
      {
        id: 'invoice-0001',
        number: '2218',
        customerName: 'شرکت آرمان تجارت',
        issueDate: '۱۴۰۵/۰۸/۰۵',
        total: '125000000.00',
        paid: '125000000.00',
        remaining: '0.00',
        currency: 'IRR',
        status: 'settled',
      },
    ];
    mockSuccess({ invoices });

    render(<DashboardBlock />);

    expect(await screen.findByText('فاکتور ۲۲۱۸')).toBeInTheDocument();
    expect(screen.getByText('۱۲۵ م')).toBeInTheDocument();
    const card = cardOf(screen.getByText('آخرین فاکتورها'));
    expect(within(card).getByRole('link', { name: 'همه' })).toHaveAttribute('href', '/sales');
  });

  it('lists near-due cheques with Persian status badges', async () => {
    const cheques: Cheque[] = [
      {
        id: 'cheque-0001',
        direction: 'received',
        sayadId: '1200000000000000',
        counterparty: 'فروشگاه نوید',
        bankName: 'ملت',
        amount: '85000000.00',
        currency: 'IRR',
        dueDate: '۱۴۰۵/۰۸/۱۰',
        status: 'near-due',
      },
      {
        id: 'cheque-0002',
        direction: 'issued',
        sayadId: '1200000000000103',
        counterparty: 'بازرگانی پارس',
        bankName: 'سامان',
        amount: '120000000.00',
        currency: 'IRR',
        dueDate: '۱۴۰۵/۰۸/۱۲',
        status: 'pending',
      },
      {
        id: 'cheque-0003',
        direction: 'received',
        sayadId: '1200000000000206',
        counterparty: 'احمد کریمی',
        bankName: 'ملی',
        amount: '45000000.00',
        currency: 'IRR',
        dueDate: '۱۴۰۵/۰۸/۱۴',
        status: 'collected',
      },
    ];
    mockSuccess({ cheques });

    render(<DashboardBlock />);

    expect(await screen.findByText('نزدیک سررسید')).toBeInTheDocument();
    expect(screen.getByText('در انتظار')).toBeInTheDocument();
    expect(screen.queryByText('وصول‌شده')).not.toBeInTheDocument();
    const card = cardOf(screen.getByText('چک‌های نزدیک سررسید'));
    expect(within(card).getByRole('link', { name: 'همه' })).toHaveAttribute('href', '/checks');
  });

  it('shows empty-state copy for lists without rows', async () => {
    mockSuccess();

    render(<DashboardBlock />);

    expect((await screen.findAllByText('هنوز موردی ثبت نشده است.')).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('links the dashboard CTAs to routes that exist in the route tree', async () => {
    mockSuccess();

    render(<DashboardBlock />);

    const journalCta = await screen.findByRole('link', { name: 'سند جدید' });
    const invoiceCta = screen.getByRole('link', { name: 'فاکتور جدید' });
    expect(journalCta).toHaveAttribute('href', '/journal');
    expect(invoiceCta).toHaveAttribute('href', '/sales');
    expect(existsSync(path.join(PANEL_ROUTES_DIR, 'journal/page.tsx'))).toBe(true);
    expect(existsSync(path.join(PANEL_ROUTES_DIR, 'sales/page.tsx'))).toBe(true);
  });
});
