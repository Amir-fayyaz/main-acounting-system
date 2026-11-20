'use client';

import { useMemo, useState } from 'react';
import { Ban, Eye, Trash2 } from 'lucide-react';

import {
  DataTable,
  sumFooter,
  type BulkAction,
  type DataTableColumn,
  type RowAction,
  type StatusMap,
} from '@repo/web/ui/components/custom/ui/data-table';

import {
  DEMO_INVOICES,
  type DemoInvoice,
  type DemoInvoiceStatus,
} from '../../../assets/mock/demo-invoices';
import { ListPage } from '../../ui';

const STATUS: StatusMap = {
  paid: { label: 'تسویه‌شده', tone: 'success' },
  partial: { label: 'پرداخت جزئی', tone: 'warning' },
  unpaid: { label: 'تسویه‌نشده', tone: 'danger' },
  void: { label: 'باطل‌شده', tone: 'neutral' },
};

const STATUS_LABEL: Record<DemoInvoiceStatus, string> = {
  paid: 'تسویه‌شده',
  partial: 'پرداخت جزئی',
  unpaid: 'تسویه‌نشده',
  void: 'باطل‌شده',
};

// Columns live outside the component so row memoization stays effective.
const columns: DataTableColumn<DemoInvoice>[] = [
  {
    key: 'no',
    header: 'شماره فاکتور',
    filter: { type: 'text' },
    className: 'font-mono text-xs',
  },
  {
    key: 'customer',
    header: 'مشتری',
    filter: { type: 'text' },
  },
  {
    key: 'date',
    header: 'تاریخ صدور',
    type: 'date',
    sortDescFirst: true,
  },
  {
    key: 'dueDate',
    header: 'سررسید',
    type: 'date',
    defaultHidden: true,
  },
  {
    key: 'amount',
    header: 'مبلغ',
    type: 'money',
    currency: 'ریال',
    sortDescFirst: true,
    footer: sumFooter<DemoInvoice>('amount'),
  },
  {
    key: 'tax',
    header: 'مالیات',
    type: 'money',
    defaultHidden: true,
    footer: sumFooter<DemoInvoice>('tax'),
  },
  {
    key: 'status',
    header: 'وضعیت',
    type: 'status',
    status: STATUS,
    searchText: (row) => STATUS_LABEL[row.status],
  },
];

export function InvoicesView() {
  const [data, setData] = useState(DEMO_INVOICES);

  const rowActions = useMemo<RowAction<DemoInvoice>[]>(
    () => [
      {
        id: 'view',
        label: 'مشاهده فاکتور',
        icon: <Eye className="size-4" />,
        inline: true,
        onSelect: () => undefined,
      },
      {
        id: 'void',
        label: 'ابطال فاکتور',
        icon: <Ban className="size-4" />,
        variant: 'destructive',
        hidden: (row) => row.status === 'void',
        confirm: {
          title: 'ابطال فاکتور',
          description: (row) => `فاکتور ${row.no} باطل می‌شود و اثر آن در گزارش‌ها برگشت می‌خورد.`,
          confirmLabel: 'ابطال',
        },
        reason: {
          label: 'دلیل ابطال',
          minLength: 5,
          presets: ['اشتباه در ثبت', 'درخواست مشتری', 'فاکتور تکراری'],
        },
        onSelect: (row) => {
          setData((rows) =>
            rows.map((item) => (item.id === row.id ? { ...item, status: 'void' } : item)),
          );
        },
      },
      {
        id: 'delete',
        label: 'حذف',
        icon: <Trash2 className="size-4" />,
        variant: 'destructive',
        confirm: {
          title: 'حذف فاکتور؟',
          description: 'این عمل قابل بازگشت نیست.',
          confirmLabel: 'حذف',
        },
        onSelect: (row) => {
          setData((rows) => rows.filter((item) => item.id !== row.id));
        },
      },
    ],
    [],
  );

  const bulkActions = useMemo<BulkAction<DemoInvoice>[]>(
    () => [
      {
        id: 'mark-paid',
        label: 'ثبت تسویه',
        confirm: {
          title: 'ثبت تسویه‌ی فاکتورهای انتخاب‌شده',
          description: (rows) => `${rows.length.toLocaleString('fa-IR')} فاکتور تسویه‌شده می‌شوند.`,
          confirmLabel: 'ثبت تسویه',
        },
        reason: {
          label: 'دلیل تسویه',
          minLength: 4,
          presets: ['دریافت نقدی', 'واریز به حساب', 'چک وصول‌شده'],
        },
        onSelect: (rows) => {
          const ids = new Set(rows.map((row) => row.id));
          setData((items) =>
            items.map((item) => (ids.has(item.id) ? { ...item, status: 'paid' } : item)),
          );
        },
      },
    ],
    [],
  );

  return (
    <ListPage
      title="فاکتورهای فروش"
      description="نمونه‌ی استفاده از DataTable v2 با داده‌ی آزمایشی — تاریخ‌ها در داده میلادی و در نمایش جلالی هستند."
    >
      <DataTable
        aria-label="فاکتورهای فروش"
        reorderableColumns
        columns={columns}
        data={data}
        rowKey={(row) => row.id}
        persistKey="demo-sales-invoices"
        rowNumbers
        selectable
        rowActions={rowActions}
        bulkActions={bulkActions}
        exportFileName="demo-invoices"
        defaultPageSize={10}
        summaryLabel="جمع این صفحه"
      />
    </ListPage>
  );
}
