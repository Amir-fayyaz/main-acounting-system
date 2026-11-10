import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { Copy, Eye, Printer, Trash2, Ban } from 'lucide-react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

import {
  DataTable,
  reorderById,
  sumFooter,
  useDataTableUrlState,
  type BulkAction,
  type DataTableColumn,
  type RowAction,
} from './index';
import { addDays, todayIso } from './date/jalali';

/* ------------------------------ demo data ------------------------------ */

interface Invoice {
  id: string;
  no: string;
  customer: string;
  seller: string;
  date: string; // Gregorian ISO — displayed as Jalali
  due: string;
  amount: number;
  discount: number;
  status: 'paid' | 'partial' | 'unpaid' | 'void';
  memo: string;
}

const CUSTOMERS = [
  'شرکت آرمان تجارت',
  'فروشگاه نوید',
  'بازرگانی پارس',
  'احمد کریمی',
  'مریم صادقی',
  'گروه صنعتی البرز',
  'داروخانه مهر',
  'پخش سپهر',
];
const SELLERS = ['نگار فرهادی', 'کامران اکبری', 'مهدی شریفی'];
const STATUSES: Invoice['status'][] = ['paid', 'partial', 'unpaid', 'paid', 'unpaid', 'void'];

const makeInvoices = (n: number): Invoice[] =>
  Array.from({ length: n }, (_, i) => {
    const date = addDays(todayIso(), -((i * 7) % 90));
    return {
      id: `inv-${i + 1}`,
      no: String(1405000 + n - i),
      customer: CUSTOMERS[(i * 5) % CUSTOMERS.length],
      seller: SELLERS[i % SELLERS.length],
      date,
      due: addDays(date, 30),
      amount: 3_000_000 + ((i * 7_919_000) % 900_000_000),
      discount: i % 4 === 0 ? 500_000 : 0,
      status: STATUSES[i % STATUSES.length],
      memo: i % 3 === 0 ? 'طبق قرارداد' : '',
    };
  });

const STATUS = {
  paid: { label: 'تسویه‌شده', tone: 'success' },
  partial: { label: 'پرداخت جزئی', tone: 'warning' },
  unpaid: { label: 'تسویه‌نشده', tone: 'danger' },
  void: { label: 'باطل‌شده', tone: 'neutral' },
} as const;

// Define columns OUTSIDE the component (or useMemo) so rows stay memoized.
const columns: DataTableColumn<Invoice>[] = [
  {
    key: 'no',
    header: 'شماره',
    sortable: true,
    filter: { type: 'text' },
    className: 'font-mono text-xs',
  },
  { key: 'customer', header: 'مشتری', filter: { type: 'text' }, editable: { required: true } },
  {
    key: 'seller',
    header: 'فروشنده',
    filter: { type: 'select', options: SELLERS.map((s) => ({ value: s, label: s })) },
  },
  { key: 'date', header: 'تاریخ', type: 'date', sortDescFirst: true, editable: { required: true } },
  { key: 'due', header: 'سررسید', type: 'date', defaultHidden: true },
  {
    key: 'amount',
    header: 'مبلغ',
    type: 'money',
    currency: 'ریال',
    sortDescFirst: true,
    editable: {
      required: true,
      validate: (v) => (Number(v) <= 0 ? 'مبلغ باید بزرگ‌تر از صفر باشد' : undefined),
    },
    footer: sumFooter<Invoice>('amount'),
  },
  { key: 'discount', header: 'تخفیف', type: 'money', footer: sumFooter<Invoice>('discount') },
  { key: 'status', header: 'وضعیت', type: 'status', status: STATUS },
  { key: 'memo', header: 'شرح', editable: true, searchable: true },
];

/* ------------------------------ stories ------------------------------ */

const meta = { title: 'Shared/DataTable', tags: ['autodocs'] } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Everything on: client mode, 120 invoices. */
function FullAccounting() {
  const [data, setData] = React.useState(() => makeInvoices(120));

  const rowActions = React.useMemo<RowAction<Invoice>[]>(
    () => [
      {
        id: 'edit',
        kind: 'edit',
        label: 'ویرایش سریع',
        inline: true,
        disabled: (r) => (r.status === 'void' ? 'فاکتور باطل‌شده قابل ویرایش نیست' : false),
      },
      {
        id: 'view',
        label: 'مشاهده',
        icon: <Eye className="size-4" />,
        onSelect: (r) => alert(`مشاهده ${r.no}`),
      },
      {
        id: 'copy',
        label: 'کپی فاکتور',
        icon: <Copy className="size-4" />,
        onSelect: (r) => alert(`کپی ${r.no}`),
      },
      {
        id: 'print',
        label: 'چاپ',
        icon: <Printer className="size-4" />,
        onSelect: () => window.print(),
      },
      {
        id: 'void',
        label: 'ابطال فاکتور',
        icon: <Ban className="size-4" />,
        variant: 'destructive',
        hidden: (r) => r.status === 'void',
        confirm: {
          title: 'ابطال فاکتور',
          description: (r) => `فاکتور ${r.no} باطل می‌شود و سند حسابداری آن برگشت می‌خورد.`,
          confirmLabel: 'ابطال',
        },
        reason: { presets: ['اشتباه در ثبت', 'درخواست مشتری', 'فاکتور تکراری'], minLength: 5 },
        onSelect: async (r) => {
          await new Promise((res) => setTimeout(res, 600));
          setData((d) => d.map((x) => (x.id === r.id ? { ...x, status: 'void' } : x)));
        },
      },
      {
        id: 'delete',
        label: 'حذف',
        icon: <Trash2 className="size-4" />,
        variant: 'destructive',
        confirm: { title: 'حذف فاکتور؟', description: 'این عمل قابل بازگشت نیست.' },
        onSelect: (r) => setData((d) => d.filter((x) => x.id !== r.id)),
      },
    ],
    [],
  );

  const bulkActions = React.useMemo<BulkAction<Invoice>[]>(
    () => [
      {
        id: 'bulk-delete',
        label: 'حذف انتخاب‌شده‌ها',
        variant: 'destructive',
        reason: true,
        onSelect: (rows) => setData((d) => d.filter((x) => !rows.some((r) => r.id === x.id))),
      },
    ],
    [],
  );

  return (
    <DataTable
      aria-label="فاکتورهای فروش"
      columns={columns}
      data={data}
      rowKey={(r) => r.id}
      persistKey="story-invoices"
      rowNumbers
      selectable
      rowActions={rowActions}
      bulkActions={bulkActions}
      reorderableRows
      reorderableColumns
      onRowReorder={(e) => setData((d) => reorderById(d, e.activeId, e.overId, (x) => x.id))}
      editReason={{ label: 'دلیل ویرایش', presets: ['اصلاح مبلغ', 'اصلاح تاریخ'] }}
      onRowSave={async (row, patch) => {
        await new Promise((res) => setTimeout(res, 500));
        setData((d) => d.map((x) => (x.id === row.id ? { ...x, ...patch } : x)));
      }}
      exportFileName="invoices"
      defaultPageSize={10}
      summaryLabel="جمع این صفحه"
    />
  );
}
export const FullAccountingClient: Story = { render: () => <FullAccounting /> };

/** Long list with windowed rendering (5,000 rows, no paging). */
export const Virtualized: Story = {
  render: () => (
    <DataTable
      aria-label="دفتر کل"
      columns={columns}
      data={makeInvoices(5000)}
      rowKey={(r) => r.id}
      paginate={false}
      virtualize
      maxHeight={520}
    />
  ),
};

/** Server mode with the URL as the source of truth (mocked Next router). */
function ServerDemo() {
  const url = useDataTableUrlState({
    filters: {
      date: 'date',
      status: 'multiselect',
      amount: 'number',
      seller: 'select',
      no: 'text',
      customer: 'text',
    },
    sortable: ['no', 'customer', 'date', 'amount', 'status'],
  });
  const all = React.useMemo(() => makeInvoices(240), []);
  // Pretend backend: apply url.query (dates are Gregorian ISO here).
  const { page, limit, search, sorting, filters } = url.query;
  let list = all.filter((r) => !search || r.customer.includes(search) || r.no.includes(search));
  const d = filters.date as { from?: string; to?: string } | undefined;
  if (d?.from) list = list.filter((r) => r.date >= d.from!);
  if (d?.to) list = list.filter((r) => r.date <= d.to!);
  if (Array.isArray(filters.status))
    list = list.filter((r) => (filters.status as string[]).includes(r.status));
  for (const s of [...sorting].reverse()) {
    const k = s.id as keyof Invoice;
    list = [...list].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (s.desc ? -1 : 1));
  }
  const total = list.length;
  return (
    <DataTable
      aria-label="فاکتورها (سرور)"
      columns={columns}
      {...url.tableProps}
      data={list.slice((page - 1) * limit, page * limit)}
      meta={{ page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }}
      rowKey={(r) => r.id}
      selectable
    />
  );
}

function MockRouter({ children }: { children: React.ReactNode }) {
  const [href, setHref] = React.useState('/invoices');
  const [pathname, search = ''] = href.split('?');
  const params = React.useMemo(() => new URLSearchParams(search), [search]);
  const router = React.useMemo<AppRouterInstance>(
    () => ({
      back() {},
      forward() {},
      refresh() {},
      prefetch() {},
      push: (h) => setHref(h),
      replace: (h) => setHref(h),
    }),
    [],
  );
  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={params}>{children}</SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}
export const ServerModeUrlState: Story = {
  render: () => (
    <MockRouter>
      <ServerDemo />
    </MockRouter>
  ),
};

/** The original (v1) API keeps working unchanged. */
export const BasicOriginalApi: Story = {
  render: () => (
    <DataTable
      toolbar={false}
      columns={[
        { key: 'no', header: 'شماره' },
        { key: 'customer', header: 'مشتری' },
      ]}
      data={makeInvoices(5)}
    />
  ),
};

export const Loading: Story = {
  render: () => <DataTable columns={columns} data={[]} loading toolbar={false} />,
};
export const Empty: Story = {
  render: () => <DataTable columns={columns} data={[]} toolbar={false} />,
};
export const ErrorState: Story = {
  render: () => (
    <DataTable columns={columns} data={[]} error="خطا در دریافت اطلاعات" toolbar={false} />
  ),
};
