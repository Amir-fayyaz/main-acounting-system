'use client';

import { useEffect, useState } from 'react';
import { CiReceipt } from 'react-icons/ci';
import { useSearchParams } from 'next/navigation';

import { Button, SearchInput, SectionLayout } from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { TrialBalanceRow, TrialBalanceSummary } from '../../assets/@types';
import { listTrialBalance } from '../../lib/trial-api';
import { TrialBalanceTable } from '../ui/TrialBalanceTable';
import { TrialSummaryCards } from '../ui/TrialSummaryCards';

const moneyFormatter = new Intl.NumberFormat('fa-IR');
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function formatMoney(amount: string): string {
  const integerPart = amount.split('.')[0].trim();
  if (!integerPart || integerPart === '0') return '۰';
  return moneyFormatter.format(BigInt(integerPart));
}

type TrialState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; rows: TrialBalanceRow[]; summary: TrialBalanceSummary };

type TrialResult =
  | { key: string; status: 'success'; rows: TrialBalanceRow[]; summary: TrialBalanceSummary }
  | { key: string; status: 'error'; message: string };

const DEFAULT_SUMMARY: TrialBalanceSummary = {
  totalDebit: '0.00',
  totalCredit: '0.00',
  isBalanced: true,
  difference: '0.00',
};

export function TrialPage() {
  const searchParams = useSearchParams();
  const search = searchParams?.get('search') ?? '';
  const [result, setResult] = useState<TrialResult | null>(null);

  const queryKey = search;

  useEffect(() => {
    let isMounted = true;

    listTrialBalance({ search })
      .then((res) => {
        if (!isMounted) return;
        setResult({
          key: queryKey,
          status: 'success',
          rows: res.data,
          summary: res.summary,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setResult({
          key: queryKey,
          status: 'error',
          message: 'خطا در دریافت تراز آزمایشی',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [queryKey, search]);

  const state: TrialState =
    result !== null && result.key === queryKey ? result : { status: 'loading' };

  const rows = state.status === 'success' ? state.rows : [];
  const summary = state.status === 'success' ? state.summary : DEFAULT_SUMMARY;
  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state.message : null;

  return (
    <SectionLayout>
      <PageHeader
        title="تراز آزمایشی"
        description="کنترل توازن مانده بدهکار و بستانکار"
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <CiReceipt className="size-4 me-1.5" />
            چاپ
          </Button>
        }
      />

      <div className="grid gap-6">
        <TrialSummaryCards summary={summary} formatMoney={formatMoney} />

        <div className="flex items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SearchInput title="جستجو در حساب‌ها…" />
          </div>
        </div>

        <TrialBalanceTable
          loading={loading}
          error={error}
          rows={rows}
          summary={summary}
          search={search}
          toFaDigits={toFaDigits}
          formatMoney={formatMoney}
        />
      </div>
    </SectionLayout>
  );
}
