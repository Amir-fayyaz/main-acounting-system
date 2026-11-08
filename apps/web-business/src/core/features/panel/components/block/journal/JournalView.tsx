'use client';

import { useEffect, useState } from 'react';

import { DataTable, SearchInput, type DataTableColumn, type PaginatedResponse } from '@repo/web';

import type { JournalEntry } from '../../../assets/@types';
import { PANEL_PAGE_SIZES, useListQuery } from '../../../hooks/useListQuery';
import { getJournalStats, listJournalEntries, type JournalStats } from '../../../lib/journal-api';
import { formatMoney } from '../../../utils/format-money';
import { toFaDigits } from '../../../utils/persian-digits';
import { JOURNAL_STATUS_LABELS, journalStatusLabel } from '../../../utils/status-label';
import { ListPage, StatusFilter, type ListStatsState } from '../../ui';

type JournalViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; response: PaginatedResponse<JournalEntry>; stats: JournalStats };

type JournalViewResult =
  | {
      key: string;
      status: 'success';
      response: PaginatedResponse<JournalEntry>;
      stats: JournalStats;
    }
  | { key: string; status: 'error' };

const STATUS_OPTIONS = Object.entries(JOURNAL_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** Prototype `.btn` (neutral) — mirrors the dashboard header actions. */
const SECONDARY_ACTION_CLASS =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent';

const columns: DataTableColumn<JournalEntry>[] = [
  { key: 'number', header: 'شماره سند', cell: (entry) => toFaDigits(entry.number) },
  { key: 'date', header: 'تاریخ' },
  { key: 'description', header: 'شرح' },
  {
    key: 'amount',
    header: 'مبلغ (ریال)',
    className: 'text-end tabular-nums',
    headerClassName: 'text-end',
    cell: (entry) => formatMoney(entry.amount),
  },
  {
    key: 'status',
    header: 'وضعیت',
    cell: (entry) => (
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        {journalStatusLabel(entry.status)}
      </span>
    ),
  },
];

/**
 * Journal list page: prototype `R.table` for `journal` — header actions
 * (print action), stats row over the filtered set, search and
 * status filter synced to the URL, and a server-paginated DataTable.
 */
export function JournalView() {
  const { page, limit, setPage, setLimit, queryParams, status, setStatus, search } = useListQuery();
  const [result, setResult] = useState<JournalViewResult | null>(null);

  // Identifies which URL request the stored result belongs to; a mismatch
  // renders the loading state without ever showing stale rows.
  const key = JSON.stringify({ ...queryParams, search, status });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      listJournalEntries({ ...queryParams, search, status }),
      getJournalStats({ search, status }),
    ])
      .then(([response, stats]) => {
        if (isMounted) setResult({ key, status: 'success', response, stats });
      })
      .catch(() => {
        if (isMounted) setResult({ key, status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [key, queryParams, search, status]);

  const state: JournalViewState =
    result !== null && result.key === key ? result : { status: 'loading' };

  const stats: ListStatsState =
    state.status === 'loading'
      ? { status: 'loading' }
      : state.status === 'error'
        ? { status: 'error' }
        : {
            status: 'success',
            items: [
              { id: 'count', label: 'تعداد اسناد', value: formatMoney(String(state.stats.count)) },
              {
                id: 'total-amount',
                label: 'جمع مبالغ',
                value: `${formatMoney(state.stats.totalAmount)} ریال`,
              },
              {
                id: 'draft-count',
                label: 'پیش‌نویس',
                value: formatMoney(String(state.stats.draftCount)),
              },
            ],
          };

  return (
    <ListPage
      title="دفتر روزنامه"
      description="همه اسناد ثبت‌شده به ترتیب تاریخ"
      actions={
        <>
          <button
            type="button"
            className={SECONDARY_ACTION_CLASS}
            onClick={() => {
              window.print();
            }}
          >
            چاپ
          </button>
        </>
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
        pageSizes={PANEL_PAGE_SIZES}
      />
    </ListPage>
  );
}
