'use client';

import { ArrowDownLeft, ArrowUpRight, Clock, Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  Button,
  H1,
  Muted,
  SearchInput,
  SectionLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui';
import { usePagination } from '@repo/web';

import type { Cheque, ChequeDirection, ChequeStatus } from '../../assets/@types/cheque.types';
import { useCheques } from '../../hook/useCheques';
import { useChequeFilters } from '../../hook/useChequeFilters';
import { CHEQUE_DIRECTION_OPTIONS, CHEQUE_STATUS_OPTIONS } from '../../lib/checks.config';
import { toPersianDigits } from '../../utils/format';
import { ChequeStatCard } from '../ui/ChequeStatCard';
import { ChecksTable } from './ChecksTable';
import { ChequeFormDialog } from './dialogs/ChequeFormDialog';

type DialogState = { mode: 'create' } | { mode: 'edit'; cheque: Cheque };

export function ChecksPageContent() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { status, direction, setStatus, setDirection } = useChequeFilters();
  const searchParams = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const { state, refresh } = useCheques({
    ...queryParams,
    search,
    ...(status === 'all' ? {} : { status }),
    ...(direction === 'all' ? {} : { direction }),
  });

  const stats = state.status === 'success' ? state.stats : null;
  const hasActiveFilters = status !== 'all' || direction !== 'all';
  const emptyMessage = hasActiveFilters
    ? 'موردی با این فیلترها پیدا نشد. فیلترها را تغییر دهید.'
    : 'هنوز چکی ثبت نشده است؛ برای شروع «ثبت چک» را بزنید.';

  const closeDialog = () => {
    setDialog(null);
  };

  return (
    <SectionLayout>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <H1 className="text-start text-xl font-bold tracking-tight sm:text-2xl">چک‌ها</H1>
            <Muted className="text-start text-xs leading-6 sm:text-sm">
              چک‌های دریافتی و پرداختی با شماره چک و شناسه صیادی
            </Muted>
          </div>

          <Button
            className="gap-1.5"
            onClick={() => {
              setDialog({ mode: 'create' });
            }}
          >
            <Plus className="size-4" aria-hidden />
            ثبت چک
          </Button>
        </header>

        <section aria-label="خلاصه‌ی وضعیت چک‌ها" className="grid gap-3 sm:grid-cols-3">
          <ChequeStatCard
            label="چک‌های دریافتی"
            value={stats ? stats.received : null}
            tone="positive"
            icon={<ArrowDownLeft className="size-5" />}
          />
          <ChequeStatCard
            label="چک‌های پرداختی"
            value={stats ? stats.issued : null}
            tone="brand"
            icon={<ArrowUpRight className="size-5" />}
          />
          <ChequeStatCard
            label="سررسیدشده"
            value={stats ? stats.overdue : null}
            tone="danger"
            icon={<Clock className="size-5" />}
          />
        </section>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:max-w-xs">
            <SearchInput title="جستجو در جدول…" />
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ChequeStatus | 'all');
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="وضعیت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {CHEQUE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={direction}
            onValueChange={(value) => {
              setDirection(value as ChequeDirection | 'all');
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="نوع چک">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              {CHEQUE_DIRECTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <section
          aria-label="فهرست چک‌ها"
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <ChecksTable
            data={state.status === 'success' ? state.response.data : []}
            meta={state.status === 'success' ? state.response.meta : undefined}
            page={page}
            limit={limit}
            loading={state.status === 'loading'}
            error={
              state.status === 'error' ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <span>{state.message}</span>
                  <Button type="button" size="sm" variant="outline" onClick={refresh}>
                    تلاش دوباره
                  </Button>
                </div>
              ) : undefined
            }
            searchTerm={search}
            emptyMessage={emptyMessage}
            onPageChange={setPage}
            onLimitChange={setLimit}
            onEdit={(cheque) => {
              setDialog({ mode: 'edit', cheque });
            }}
          />
        </section>
      </div>

      {dialog ? (
        <ChequeFormDialog
          key={dialog.mode === 'edit' ? `edit-${dialog.cheque.id}` : 'create'}
          open
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          mode={dialog.mode}
          cheque={dialog.mode === 'edit' ? dialog.cheque : null}
          onSaved={(saved) => {
            refresh();
            const number = toPersianDigits(saved.number);
            toast.success(
              dialog.mode === 'edit' ? `چک ${number} ویرایش شد.` : `چک ${number} ثبت شد.`,
            );
          }}
        />
      ) : null}
    </SectionLayout>
  );
}
