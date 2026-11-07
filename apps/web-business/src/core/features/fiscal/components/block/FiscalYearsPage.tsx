'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, X } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  SectionLayout,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web/ui';
import { initialFiscalYears, type FiscalYear } from '../../assets/mock/fiscal-data';

export function FiscalYearsPage() {
  const [years, setYears] = useState(initialFiscalYears);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('سال مالی ۱۴۰۷');
  const [from, setFrom] = useState('۱۴۰۷/۰۱/۰۱');
  const [to, setTo] = useState('۱۴۰۷/۱۲/۲۹');
  const sortedYears = useMemo(() => [...years].sort((a, b) => b.id.localeCompare(a.id)), [years]);

  function addYear(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const year: FiscalYear = {
      id: `${Date.now()}`,
      title: title.trim(),
      from,
      to,
      periods: 12,
      openPeriods: 12,
      status: 'آینده',
    };
    setYears((current) => [...current, year]);
    setDialogOpen(false);
  }

  return (
    <SectionLayout>
      <div className="space-y-6" dir="rtl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              تنظیمات مالی <span aria-hidden="true">/</span> سال‌های مالی
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">سال‌های مالی</h1>
            <p className="text-sm text-muted-foreground">
              بازه‌های مالی شرکت و وضعیت دوره‌های هر سال را مدیریت کنید.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden="true" /> سال مالی جدید
          </Button>
        </header>

        <Card className="gap-0 py-0">
          <CardHeader className="gap-1 border-b border-border py-5">
            <CardTitle>فهرست سال‌های مالی</CardTitle>
            <CardDescription>
              {years.length.toLocaleString('fa-IR')} سال مالی ثبت شده
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {years.length ? (
              <Table aria-label="سال‌های مالی">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>عنوان</TableHead>
                    <TableHead>از تاریخ</TableHead>
                    <TableHead>تا تاریخ</TableHead>
                    <TableHead>تعداد دوره‌ها</TableHead>
                    <TableHead>دوره‌های باز</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedYears.map((year) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">{year.title}</TableCell>
                      <TableCell className="tabular-nums">{year.from}</TableCell>
                      <TableCell className="tabular-nums">{year.to}</TableCell>
                      <TableCell className="tabular-nums">
                        {year.periods.toLocaleString('fa-IR')}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {year.openPeriods.toLocaleString('fa-IR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{year.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <CalendarDays className="size-8 text-muted-foreground" aria-hidden="true" />
                <h2 className="font-semibold">هنوز سال مالی تعریف نشده</h2>
                <p className="max-w-prose text-sm text-muted-foreground">
                  برای ثبت سند و فاکتور، ابتدا سال مالی و دوره‌های آن را بسازید.
                </p>
                <Button asChild>
                  <Link href="/fiscal-setup">شروع راه‌اندازی مالی</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {dialogOpen && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDialogOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-year-title"
              className="w-full max-w-xl rounded-md border border-border bg-card text-card-foreground"
            >
              <form onSubmit={addYear}>
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                  <div>
                    <h2 id="new-year-title" className="font-semibold">
                      سال مالی جدید
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      اطلاعات بازه سال را وارد کنید.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="بستن"
                    onClick={() => setDialogOpen(false)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm sm:col-span-2">
                    عنوان
                    <Input
                      required
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    از تاریخ
                    <Input
                      required
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                      dir="ltr"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    تا تاریخ
                    <Input
                      required
                      value={to}
                      onChange={(event) => setTo(event.target.value)}
                      dir="ltr"
                    />
                  </label>
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    دوره‌های ماهانه پس از ذخیره به‌صورت نمایشی ساخته می‌شوند.
                  </p>
                </div>
                <div className="flex justify-start gap-2 border-t border-border p-5">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    انصراف
                  </Button>
                  <Button type="submit">ایجاد سال مالی</Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </SectionLayout>
  );
}
