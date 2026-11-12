'use client';

import { Landmark, ListChecks, Plus, Wallet } from 'lucide-react';
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

import type { Account, AccountType } from '../../assets/@types/account.types';
import { useAccountFilters } from '../../hook/useAccountFilters';
import { useAccounts } from '../../hook/useAccounts';
import { ACCOUNT_TYPE_OPTIONS } from '../../lib/accounts.config';
import { formatCountFa } from '../../utils/format';
import { formatMoneyCompactFa } from '../../utils/money';
import { AccountPrintButton } from '../ui/AccountPrintButton';
import { AccountStatCard } from '../ui/AccountStatCard';
import { AccountsPrintStyles } from './AccountsPrintStyles';
import { AccountsTable } from './AccountsTable';
import { AccountFormDialog } from './dialogs/AccountFormDialog';

export function AccountsPageContent() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { type, setType } = useAccountFilters();
  const searchParams = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const [isDialogOpen, setDialogOpen] = useState(false);

  const { state, refresh } = useAccounts({
    ...queryParams,
    search,
    ...(type === 'all' ? {} : { type }),
  });

  const stats = state.status === 'success' ? state.stats : null;
  const emptyMessage =
    type === 'all'
      ? 'هنوز حسابی ثبت نشده است؛ برای شروع «حساب جدید» را بزنید.'
      : 'موردی با این نوع حساب پیدا نشد. فیلتر را تغییر دهید.';

  return (
    <SectionLayout>
      <AccountsPrintStyles />
      <div data-accounts-print className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <H1 className="text-start text-xl font-bold tracking-tight sm:text-2xl">
              بانک و صندوق
            </H1>
            <Muted className="text-start text-xs leading-6 sm:text-sm">
              حساب‌های بانکی، صندوق‌ها و تنخواه با موجودی
            </Muted>
          </div>

          <div data-accounts-actions className="flex flex-wrap items-center gap-2 print:hidden">
            <AccountPrintButton />

            <Button
              className="gap-1.5"
              onClick={() => {
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              حساب جدید
            </Button>
          </div>
        </header>

        <section aria-label="خلاصه‌ی وضعیت حساب‌ها" className="grid gap-3 sm:grid-cols-3">
          <AccountStatCard
            label="موجودی بانک‌ها"
            value={stats ? formatMoneyCompactFa(stats.bankBalance.amount) : null}
            tone="brand"
            icon={<Landmark className="size-5" />}
          />
          <AccountStatCard
            label="موجودی صندوق‌ها"
            value={stats ? formatMoneyCompactFa(stats.cashBalance.amount) : null}
            tone="positive"
            icon={<Wallet className="size-5" />}
          />
          <AccountStatCard
            label="تعداد حساب‌ها"
            value={stats ? formatCountFa(stats.total) : null}
            tone="default"
            icon={<ListChecks className="size-5" />}
          />
        </section>

        <div
          data-accounts-toolbar
          className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center print:hidden"
        >
          <div className="w-full sm:max-w-xs">
            <SearchInput title="جستجو در جدول…" />
          </div>

          <Select
            value={type}
            onValueChange={(value) => {
              setType(value as AccountType | 'all');
            }}
          >
            <SelectTrigger className="w-full sm:w-40" aria-label="نوع حساب">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <section
          aria-label="فهرست حساب‌ها"
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <AccountsTable
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
        <AccountFormDialog
          open
          onOpenChange={setDialogOpen}
          onSaved={(saved: Account) => {
            refresh();
            toast.success(`حساب «${saved.title}» ثبت شد.`);
          }}
        />
      ) : null}
    </SectionLayout>
  );
}
