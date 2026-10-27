import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';

import {
  Badge,
  DataTable,
  usePagination,
  type DataTableColumn,
  type PaginatedResponse,
} from '@repo/web';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';


interface Membership {
  id: string;
  name: string;
  role: string;
  status: 'فعال' | 'متوقف' | 'در انتظار';
  joinedAt: string;
}

const ROLES = ['صندوقدار', 'حسابدار', 'مدیر شعبه', 'انباردار', 'ویزیتور'] as const;
const STATUSES: readonly Membership['status'][] = ['فعال', 'فعال', 'در انتظار', 'فعال', 'متوقف'];

const MEMBERSHIPS: Membership[] = [
  'سارا محمدی',
  'علی رضایی',
  'مریم حسینی',
  'رضا کریمی',
  'زهرا صادقی',
  'محمد نوری',
  'فاطمه عباسی',
  'حسین موسوی',
  'نرگس جعفری',
  'امیر قاسمی',
  'لیلا احمدی',
  'سعید رحیمی',
  'آتنا مرادی',
  'بهرام شریفی',
  'ترانه نعمتی',
  'جابر فرهادی',
  'حنانه سلطانی',
  'داوود مهدوی',
  'ریحانه ایزدی',
  'سامان توکلی',
  'شیرین محبی',
  'کامران دادگر',
  'مرتضی بیگی',
  'ندا رستمی',
  'ویدا کاظمی',
].map((name, index) => ({
  id: `M-${String(index + 1).padStart(3, '0')}`,
  name,
  role: ROLES[index % ROLES.length],
  status: STATUSES[index % STATUSES.length],
  joinedAt: `1404/${String((index % 12) + 1).padStart(2, '0')}/${String((index % 28) + 1).padStart(2, '0')}`,
}));

const columns: DataTableColumn<Membership>[] = [
  { key: 'id', header: 'شناسه', className: 'font-mono text-xs' },
  { key: 'name', header: 'نام' },
  { key: 'role', header: 'نقش' },
  {
    key: 'status',
    header: 'وضعیت',
    cell: (row) => (
      <Badge
        variant={
          row.status === 'فعال' ? 'success' : row.status === 'متوقف' ? 'secondary' : 'outline'
        }
      >
        {row.status}
      </Badge>
    ),
  },
  { key: 'joinedAt', header: 'تاریخ عضویت' },
];

function MembershipsPage() {
  const { page, limit } = usePagination();
  const start = (page - 1) * limit;
  const payload: PaginatedResponse<Membership> = {
    data: MEMBERSHIPS.slice(start, start + limit),
    meta: {
      page,
      limit,
      total: MEMBERSHIPS.length,
      totalPages: Math.ceil(MEMBERSHIPS.length / limit),
    },
  };

  return (
    <DataTable
      columns={columns}
      rows={payload.data}
      meta={payload.meta}
      rowKey={(row) => row.id}
      aria-label="عضویت‌ها"
    />
  );
}

function MockPaginatedMemberships() {
  const [href, setHref] = React.useState('/memberships?page=1&limit=10');
  const [pathname, search = ''] = href.split('?');
  const searchParams = React.useMemo(() => new URLSearchParams(search), [search]);
  const router = React.useMemo<AppRouterInstance>(
    () => ({
      back: () => {},
      forward: () => {},
      refresh: () => {},
      prefetch: () => {},
      push: (nextHref) => setHref(nextHref),
      replace: (nextHref) => setHref(nextHref),
    }),
    [],
  );

  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={searchParams}>
          <MembershipsPage />
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

const meta = {
  title: 'Shared/DataTable',
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const Paginated: Story = {
  render: () => <MockPaginatedMemberships />,
};

export const WithoutPagination: Story = {
  render: () => (
    <DataTable columns={columns} rows={MEMBERSHIPS.slice(0, 8)} aria-label="عضویت‌ها" />
  ),
};

export const Loading: Story = {
  render: () => <DataTable columns={columns} rows={[]} loading aria-label="عضویت‌ها" />,
};

export const Empty: Story = {
  render: () => <DataTable columns={columns} rows={[]} aria-label="عضویت‌ها" />,
};

export const SearchEmpty: Story = {
  render: () => (
    <DataTable columns={columns} rows={[]} searchTerm="ناموجود" aria-label="عضویت‌ها" />
  ),
};

export const Error: Story = {
  render: () => (
    <DataTable
      columns={columns}
      rows={MEMBERSHIPS.slice(0, 3)}
      error="خطا در دریافت اطلاعات"
      aria-label="عضویت‌ها"
    />
  ),
};
