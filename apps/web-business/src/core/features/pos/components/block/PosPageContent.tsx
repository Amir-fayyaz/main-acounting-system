'use client';

import { Plus } from 'lucide-react';
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

import type { PosStatus, PosTerminal } from '../../assets/@types/pos-terminal.types';
import { usePosStatusFilter } from '../../hook/usePosStatusFilter';
import { usePosTerminals } from '../../hook/usePosTerminals';
import { POS_STATUS_OPTIONS } from '../../lib/pos.config';
import { PosPrintButton } from '../ui/PosPrintButton';
import { PosPrintStyles } from './PosPrintStyles';
import { PosTable } from './PosTable';
import { PosTerminalFormDialog } from './dialogs/PosTerminalFormDialog';

export function PosPageContent() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { status, setStatus } = usePosStatusFilter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const [isDialogOpen, setDialogOpen] = useState(false);

  const { state, refresh } = usePosTerminals({
    ...queryParams,
    search,
    ...(status === 'all' ? {} : { status }),
  });

  const emptyMessage =
    status === 'all'
      ? 'هنوز دستگاهی ثبت نشده است؛ برای شروع «دستگاه جدید» را بزنید.'
      : 'موردی با این وضعیت پیدا نشد. فیلتر را تغییر دهید.';

  return (
    <SectionLayout>
      <PosPrintStyles />
      <div data-pos-print className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <H1 className="text-start text-xl font-bold tracking-tight sm:text-2xl">
              دستگاه‌های POS
            </H1>
            <Muted className="text-start text-xs leading-6 sm:text-sm">
              ترمینال‌ها، پذیرنده‌ها و حساب مقصد تسویه
            </Muted>
          </div>

          <div data-pos-actions className="flex flex-wrap items-center gap-2 print:hidden">
            <PosPrintButton />

            <Button
              className="gap-1.5"
              onClick={() => {
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              دستگاه جدید
            </Button>
          </div>
        </header>

        <div
          data-pos-toolbar
          className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center print:hidden"
        >
          <div className="w-full sm:max-w-xs">
            <SearchInput title="جستجو در جدول…" />
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as PosStatus | 'all');
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="وضعیت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {POS_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <section
          aria-label="فهرست دستگاه‌های POS"
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <PosTable
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
          />
        </section>
      </div>

      {isDialogOpen ? (
        <PosTerminalFormDialog
          open
          onOpenChange={setDialogOpen}
          onSaved={(saved: PosTerminal) => {
            refresh();
            toast.success(`دستگاه «${saved.title}» ثبت شد.`);
          }}
        />
      ) : null}
    </SectionLayout>
  );
}
