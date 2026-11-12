'use client';

import { useEffect, useState } from 'react';
import { CiCircleCheck, CiCircleAlert, CiReceipt } from 'react-icons/ci';
import { useSearchParams } from 'next/navigation';

import {
  Button,
  Card,
  CardContent,
  SearchInput,
  SectionLayout,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { TrialBalanceRow, TrialBalanceSummary } from '../../assets/@types';
import { listTrialBalance } from '../../lib/trial-api';

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
        {/* KPI / Balance Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">جمع مانده بدهکار</div>
              <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
                {formatMoney(summary.totalDebit)} <span className="text-xs font-normal">ریال</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">جمع مانده بستانکار</div>
              <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
                {formatMoney(summary.totalCredit)} <span className="text-xs font-normal">ریال</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">وضعیت تراز</div>
              <div className="flex items-center gap-1.5 mt-1">
                {summary.isBalanced ? (
                  <>
                    <CiCircleCheck className="size-5 text-success" />
                    <span className="text-base font-semibold text-success">تراز است</span>
                  </>
                ) : (
                  <>
                    <CiCircleAlert className="size-5 text-destructive" />
                    <span className="text-base font-semibold text-destructive">
                      عدم تراز (اختلاف: {formatMoney(summary.difference)} ریال)
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SearchInput title="جستجو در حساب‌ها…" />
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table aria-label="تراز آزمایشی">
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">کد</TableHead>
                <TableHead>نام حساب</TableHead>
                <TableHead className="text-end">مانده بدهکار (ریال)</TableHead>
                <TableHead className="text-end">مانده بستانکار (ریال)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    در حال بارگذاری اطلاعات…
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    {search ? `حسابی مطابق «${search}» پیدا نشد.` : 'حسابی ثبت نشده است.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{toFaDigits(row.code)}</TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {row.debit === '0.00' ? '—' : formatMoney(row.debit)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {row.credit === '0.00' ? '—' : formatMoney(row.credit)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {!loading && !error && rows.length > 0 && (
              <TableFooter>
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>جمع کل</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatMoney(summary.totalDebit)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatMoney(summary.totalCredit)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </SectionLayout>
  );
}
