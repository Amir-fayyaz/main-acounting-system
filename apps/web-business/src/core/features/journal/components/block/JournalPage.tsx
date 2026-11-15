'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CiCirclePlus, CiReceipt } from 'react-icons/ci';

import {
  Button,
  DataTable,
  SearchInput,
  type DataTableColumn,
  type PaginatedResponse,
} from '@repo/web';
import { ListPage } from '../../../panel/components/ui/ListPage';
import { StatusFilter } from '../../../panel/components/ui/StatusFilter';
import { useListQuery } from '../../../panel/hooks/useListQuery';

import type { JournalEntry, JournalStats } from '../../assets/@types';
import { getJournalStats, listJournalEntries } from '../../lib/journal-api';
import { formatMoneyAmount, toPersianDigits } from '../../utils/journal-formatters';
import { JournalStatusBadge } from '../ui/JournalStatusBadge';

type ListStatsState = React.ComponentProps<typeof ListPage>['stats'];

type JournalPageState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: PaginatedResponse<JournalEntry>; stats: JournalStats };

type JournalPageResult =
  | {
      key: string;
      status: 'success';
      response: PaginatedResponse<JournalEntry>;
      stats: JournalStats;
    }
  | { key: string; status: 'error' };

const STATUS_OPTIONS = [
  { value: 'balanced', label: 'تراز' },
  { value: 'draft', label: 'پیش‌نویس' },
] as const;

const columns: DataTableColumn<JournalEntry>[] = [
  {
    key: 'number',
    header: 'شماره سند',
    cell: (entry) => toPersianDigits(entry.number),
    sortable: false,
  },
  {
    key: 'date',
    header: 'تاریخ',
    sortable: false,
  },
  {
    key: 'description',
    header: 'شرح',
    sortable: false,
  },
  {
    key: 'amount',
    header: 'مبلغ (ریال)',
    className: 'text-end tabular-nums',
    headerClassName: 'text-end',
    cell: (entry) => formatMoneyAmount(entry.amount),
    sortable: false,
  },
  {
    key: 'status',
    header: 'وضعیت',
    cell: (entry) => <JournalStatusBadge status={entry.status} />,
    sortable: false,
  },
];

export function JournalPage() {
  const { page, limit, setPage, setLimit, queryParams, status, setStatus, search } = useListQuery();
  const [result, setResult] = useState<JournalPageResult | null>(null);

  const queryKey = JSON.stringify({ ...queryParams, search, status });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      listJournalEntries({ ...queryParams, search, status }),
      getJournalStats({ search, status }),
    ])
      .then(([response, stats]) => {
        if (isMounted) setResult({ key: queryKey, status: 'success', response, stats });
      })
      .catch(() => {
        if (isMounted) setResult({ key: queryKey, status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [queryKey, queryParams, search, status]);

  const state: JournalPageState =
    result !== null && result.key === queryKey ? result : { status: 'loading' };

  const stats: ListStatsState =
    state.status === 'loading'
      ? { status: 'loading' }
      : state.status === 'error'
        ? { status: 'error' }
        : {
            status: 'success',
            items: [
              {
                id: 'count',
                label: 'تعداد اسناد',
                value: toPersianDigits(state.stats.count),
              },
              {
                id: 'total-amount',
                label: 'جمع مبالغ',
                value: `${formatMoneyAmount(state.stats.totalAmount)} ریال`,
              },
              {
                id: 'draft-count',
                label: 'پیش‌نویس',
                value: toPersianDigits(state.stats.draftCount),
              },
            ],
          };

  return (
    <ListPage
      title="دفتر روزنامه"
      description="همه اسناد ثبت‌شده به ترتیب تاریخ"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <CiReceipt className="size-4 me-1.5" />
            چاپ
          </Button>
          <Button asChild size="sm">
            <Link href="/journal/new">
              <CiCirclePlus className="size-4 me-1.5" />
              ثبت سند مرکب
            </Link>
          </Button>
        </div>
      }
      stats={stats}
      toolbar={{
        search: <SearchInput title="جستجو در جدول…" />,
        filter: <StatusFilter value={status} options={STATUS_OPTIONS} onChange={setStatus} />,
      }}
    >
      <DataTable<JournalEntry>
        aria-label="دفتر روزنامه"
        columns={columns}
        data={state.status === 'success' ? state.response.data : []}
        rowKey={(entry) => entry.id}
        loading={state.status === 'loading'}
        error={
          state.status === 'error'
            ? 'دریافت اسناد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
            : undefined
        }
        emptyMessage="هنوز موردی ثبت نشده است."
        searchEmptyMessage={`نتیجه‌ای برای «${search}» پیدا نشد. عبارت دیگری را جستجو کنید.`}
        searchTerm={search}
        meta={state.status === 'success' ? state.response.meta : undefined}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        toolbar={{ search: false }}
      />
    </ListPage>
  );
}
