'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CiCirclePlus, CiGrid41, CiSettings } from 'react-icons/ci';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SectionLayout,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { FiscalPeriod, FiscalYear } from '../../assets/@types';
import { createFiscalYear, getFiscalPeriods, getFiscalYears } from '../../lib/fiscal-periods-api';
import { mapFiscalErrorMessage } from '../../lib/fiscal-api';
import { toFaDigits } from '../../utils/fiscal-date';
import { NewFiscalYearDialog } from '../ui/NewFiscalYearDialog';

export function FiscalYearsPage() {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [periodsByYear, setPeriodsByYear] = useState<Record<string, FiscalPeriod[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [isNewYearOpen, setIsNewYearOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const yearList = await getFiscalYears({ preferApi: true });
        if (!isMounted) return;
        setYears(yearList);

        const periodMap: Record<string, FiscalPeriod[]> = {};
        await Promise.all(
          yearList.map(async (y) => {
            const periods = await getFiscalPeriods(y.id, { preferApi: true });
            periodMap[y.id] = periods;
          }),
        );
        if (!isMounted) return;
        setPeriodsByYear(periodMap);
      } catch {
        if (isMounted) {
          toast.error('خطا در دریافت اطلاعات سال‌های مالی');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  const handleCreateYear = async (params: {
    title: string;
    jalaliYear: number;
    from: string;
    to: string;
    autoGeneratePeriods: boolean;
  }) => {
    try {
      await createFiscalYear(
        {
          title: params.title,
          jalaliYear: params.jalaliYear,
          from: params.from,
          to: params.to,
          autoGeneratePeriods: params.autoGeneratePeriods,
        },
        { syncWithApi: true },
      );
      toast.success('سال مالی جدید با موفقیت ایجاد شد');
      setRefreshIndex((prev) => prev + 1);
    } catch (err: unknown) {
      // If API rejected or network failed, fallback will be handled or show error
      const msg = mapFiscalErrorMessage(err, 'خطا در ایجاد سال مالی جدید');
      toast.error(msg);
      // Reload in case local store was updated
      setRefreshIndex((prev) => prev + 1);
    }
  };

  // Determine year status
  const getYearStatus = (y: FiscalYear) => {
    const ps = periodsByYear[y.id] ?? [];
    if (!ps.length) return { label: 'بدون دوره', variant: 'secondary' as const };
    const allClosed = ps.every((p) => p.status === 'closed');
    if (allClosed) return { label: 'بسته', variant: 'destructive' as const };
    return { label: 'فعال', variant: 'default' as const };
  };

  const totalPeriodsCount = Object.values(periodsByYear).reduce(
    (acc, list) => acc + list.length,
    0,
  );
  const activeYear = years.find((y) => y.status === 'open') ?? years[0];

  return (
    <SectionLayout>
      <PageHeader
        title="سال‌های مالی"
        description="تعریف چارچوب سالانه حسابداری، تقویم مالی و اتصال به دوره‌ها"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/fiscal-setup">
                <CiSettings className="size-4 me-1.5" />
                راه‌اندازی مالی
              </Link>
            </Button>
            <Button size="sm" onClick={() => setIsNewYearOpen(true)}>
              <CiCirclePlus className="size-4 me-1.5" />
              سال مالی جدید
            </Button>
          </div>
        }
      />

      <div className="grid gap-6">
        {/* KPI stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                تعداد سال‌های مالی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tabular-nums">
                {toFaDigits(years.length)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                سال مالی جاری
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeYear ? activeYear.title : '—'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                کل دوره‌های مالی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tabular-nums">
                {toFaDigits(totalPeriodsCount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Years Table */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <Table aria-label="سال‌های مالی">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">عنوان سال مالی</TableHead>
                <TableHead className="w-1/6">از تاریخ</TableHead>
                <TableHead className="w-1/6">تا تاریخ</TableHead>
                <TableHead className="w-1/6">تعداد دوره‌ها</TableHead>
                <TableHead className="w-1/6">دوره‌های باز</TableHead>
                <TableHead className="w-1/6">وضعیت</TableHead>
                <TableHead className="text-end">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    در حال بارگذاری سال‌های مالی…
                  </TableCell>
                </TableRow>
              ) : years.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <CiGrid41 className="size-10 text-muted-foreground/60" />
                      <div className="space-y-1">
                        <p className="font-medium text-base">هنوز سال مالی تعریف نشده است</p>
                        <p className="text-muted-foreground text-sm">
                          برای ثبت اسناد و فاکتورها، ابتدا سال مالی و دوره‌های آن را ایجاد کنید.
                        </p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => setIsNewYearOpen(true)}>
                          <CiCirclePlus className="size-4 me-1.5" />
                          ایجاد اولین سال مالی
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/fiscal-setup">راه‌اندازی گام به گام</Link>
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                years.map((year) => {
                  const ps = periodsByYear[year.id] ?? [];
                  const openCount = ps.filter(
                    (p) => p.status === 'open' || p.status === 'reopened',
                  ).length;
                  const statusInfo = getYearStatus(year);

                  return (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">{year.title}</TableCell>
                      <TableCell className="tabular-nums font-mono text-sm">
                        {toFaDigits(year.from)}
                      </TableCell>
                      <TableCell className="tabular-nums font-mono text-sm">
                        {toFaDigits(year.to)}
                      </TableCell>
                      <TableCell className="tabular-nums font-mono text-sm">
                        {toFaDigits(ps.length)}
                      </TableCell>
                      <TableCell className="tabular-nums font-mono text-sm">
                        {toFaDigits(openCount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/fiscal-periods?year=${encodeURIComponent(year.id)}`}>
                            دوره‌ها
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewFiscalYearDialog
        open={isNewYearOpen}
        onOpenChange={setIsNewYearOpen}
        existingYears={years}
        onConfirm={handleCreateYear}
      />
    </SectionLayout>
  );
}
