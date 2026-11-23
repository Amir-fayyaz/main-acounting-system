'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CiCircleCheck, CiCircleInfo } from 'react-icons/ci';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  Card,
  CardContent,
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
} from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { FiscalPeriod, FiscalYear } from '../../assets/@types';
import {
  createFiscalYear,
  getFiscalPeriods,
  getFiscalYears,
  selectActiveFiscalPeriod,
  updatePeriodStatus,
} from '../../lib/fiscal-periods-api';
import { mapFiscalErrorMessage } from '../../lib/fiscal-api';
import { MONTH_NAMES, toFaDigits } from '../../utils/fiscal-date';
import { gregorianToJalali, jalaliDaysInMonth } from '../../utils/fiscal-calendar';

const STEPS = ['تعریف سال مالی', 'ایجاد دوره‌ها', 'باز کردن دوره‌ها', 'مرور و اتمام'];

export function FiscalSetupWizard() {
  const router = useRouter();
  const currentJalaliYear = gregorianToJalali(new Date().toISOString().slice(0, 10)).jYear;

  const [loading, setLoading] = useState(true);
  const [existingYears, setExistingYears] = useState<FiscalYear[]>([]);
  const [existingPeriods, setExistingPeriods] = useState<FiscalPeriod[]>([]);

  // Wizard state
  const [step, setStep] = useState(0);
  const [jalaliYear, setJalaliYear] = useState(currentJalaliYear);
  const [title, setTitle] = useState(`سال مالی ${toFaDigits(currentJalaliYear)}`);
  const [openPeriodIndices, setOpenPeriodIndices] = useState<Set<number>>(
    new Set(Array.from({ length: 12 }, (_, i) => i)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getFiscalYears({ preferApi: true })
      .then(async (yList) => {
        if (!isMounted) return;
        setExistingYears(yList);
        if (yList.length > 0) {
          const pList = await getFiscalPeriods(yList[0].id, { preferApi: true });
          if (isMounted) setExistingPeriods(pList);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const lastDay = jalaliDaysInMonth(jalaliYear, 12);
  const fromDisplay = `${toFaDigits(jalaliYear)}/۰۱/۰۱`;
  const toDisplay = `${toFaDigits(jalaliYear)}/۱۲/${toFaDigits(lastDay)}`;

  const isSetupDone =
    existingYears.length > 0 &&
    existingPeriods.some((p) => p.status === 'open' || p.status === 'reopened');

  const activeYear = existingYears[0];
  const activePeriod = existingPeriods.find((p) => p.status === 'open' || p.status === 'reopened');

  // Preview periods generated
  const previewPeriods = MONTH_NAMES.map((name, i) => {
    const month = String(i + 1).padStart(2, '0');
    const mDay = i < 6 ? 31 : i < 11 ? 30 : lastDay;
    return {
      sequence: i + 1,
      name: `${name} ${toFaDigits(jalaliYear)}`,
      from: `${toFaDigits(jalaliYear)}/${toFaDigits(month)}/۰۱`,
      to: `${toFaDigits(jalaliYear)}/${toFaDigits(month)}/${toFaDigits(mDay)}`,
    };
  });

  const togglePeriodOpen = (idx: number) => {
    setOpenPeriodIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const year = await createFiscalYear(
        {
          title: title.trim(),
          jalaliYear,
          from: fromDisplay,
          to: toDisplay,
          autoGeneratePeriods: true,
        },
        { syncWithApi: true },
      );

      // Adjust period statuses if any were unchecked
      const periods = await getFiscalPeriods(year.id);
      for (let i = 0; i < periods.length; i++) {
        if (!openPeriodIndices.has(i)) {
          await updatePeriodStatus(periods[i].id, 'closed');
        }
      }

      // Select first open period as active
      const firstOpen = periods.find((_, i) => openPeriodIndices.has(i));
      if (firstOpen) {
        await selectActiveFiscalPeriod(firstOpen.id);
      }

      toast.success('راه‌اندازی مالی با موفقیت انجام شد');
      router.push('/fiscal-periods');
    } catch (err) {
      toast.error(mapFiscalErrorMessage(err, 'خطا در تکمیل راه‌اندازی مالی'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SectionLayout>
        <div className="flex justify-center items-center py-24 text-muted-foreground">
          در حال بررسی وضعیت راه‌اندازی مالی…
        </div>
      </SectionLayout>
    );
  }

  if (isSetupDone) {
    return (
      <SectionLayout>
        <PageHeader
          title="راه‌اندازی مالی"
          description="بررسی وضعیت تقویم، سال مالی و دوره‌های فعال"
        />

        <div className="grid gap-6">
          <div className="flex items-center gap-3 p-4 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CiCircleCheck className="size-6 shrink-0" />
            <div>
              <p className="font-medium">راه‌اندازی مالی کامل است</p>
              <p className="text-sm opacity-90">
                سال و دوره‌های مالی فعال تعریف شده‌اند و شرکت آماده ثبت سند و فاکتور است.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  سال مالی فعال
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{activeYear ? activeYear.title : '—'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  دوره‌ی مالی فعال
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{activePeriod ? activePeriod.name : '—'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  وضعیت دوره
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default">باز (آماده ثبت)</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 pt-2">
            <Button size="sm" asChild>
              <Link href="/fiscal-periods">مدیریت دوره‌های مالی</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/fiscal-years">سال‌های مالی</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/">بازگشت به داشبورد</Link>
            </Button>
          </div>
        </div>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout>
      <PageHeader
        title="راه‌اندازی مالی"
        description="ویزارد ۴ مرحله‌ای تنظیم سال مالی و ایجاد خودکار دوره‌ها"
      />

      <div className="grid gap-6">
        {/* Step progress pills */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/60 border border-border">
          {STEPS.map((sLabel, idx) => (
            <div
              key={sLabel}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                idx === step
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : idx < step
                    ? 'text-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              <span className="size-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-mono">
                {idx < step ? '✓' : toFaDigits(idx + 1)}
              </span>
              <span>{sLabel}</span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <div className="grid gap-4 max-w-lg">
                <p className="text-sm text-muted-foreground">
                  سال مالی و تقویم حسابداری شرکت را مشخص کنید. دوره‌های ماهانه بر اساس این بازه
                  ایجاد خواهند شد.
                </p>

                <div className="grid gap-2">
                  <label htmlFor="w-year" className="text-sm font-medium">
                    سال هجری شمسی
                  </label>
                  <Input
                    id="w-year"
                    type="number"
                    value={jalaliYear}
                    onChange={(e) => {
                      const yVal = parseInt(e.target.value, 10) || jalaliYear;
                      setJalaliYear(yVal);
                      setTitle(`سال مالی ${toFaDigits(yVal)}`);
                    }}
                    className="font-mono tabular-nums"
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="w-title" className="text-sm font-medium">
                    عنوان سال مالی
                  </label>
                  <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded bg-muted/40 border border-border">
                    <span className="text-xs text-muted-foreground block">از تاریخ</span>
                    <span className="font-mono font-medium">{fromDisplay}</span>
                  </div>
                  <div className="p-3 rounded bg-muted/40 border border-border">
                    <span className="text-xs text-muted-foreground block">تا تاریخ</span>
                    <span className="font-mono font-medium">{toDisplay}</span>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  پیش‌نمایش ۱۲ دوره‌ی ماهانه که به‌طور خودکار ایجاد خواهند شد:
                </p>

                <div className="rounded-md border border-border overflow-hidden">
                  <Table aria-label="پیش‌نمایش دوره‌ها">
                    <TableHeader>
                      <TableRow>
                        <TableHead>دوره</TableHead>
                        <TableHead>از تاریخ</TableHead>
                        <TableHead>تا تاریخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewPeriods.map((p) => (
                        <TableRow key={p.sequence}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-sm">{p.from}</TableCell>
                          <TableCell className="font-mono text-sm">{p.to}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 p-3 rounded-md bg-muted/60 text-muted-foreground border border-border text-sm">
                  <CiCircleInfo className="size-4 shrink-0 mt-0.5" />
                  <span>
                    دوره‌هایی که تیک ندارند به‌صورت «بسته» ایجاد می‌شوند. حداقل یک دوره باید باز
                    بماند.
                  </span>
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <Table aria-label="دوره‌های باز">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>دوره</TableHead>
                        <TableHead>بازه تاریخی</TableHead>
                        <TableHead>وضعیت اولیه</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewPeriods.map((p, idx) => (
                        <TableRow key={p.sequence}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={openPeriodIndices.has(idx)}
                              onChange={() => togglePeriodOpen(idx)}
                              className="rounded border-border text-primary size-4"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {p.from} تا {p.to}
                          </TableCell>
                          <TableCell>
                            <Badge variant={openPeriodIndices.has(idx) ? 'default' : 'secondary'}>
                              {openPeriodIndices.has(idx) ? 'باز' : 'بسته'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs text-muted-foreground">عنوان سال</CardTitle>
                    </CardHeader>
                    <CardContent className="font-bold">{title}</CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs text-muted-foreground">
                        تعداد کل دوره‌ها
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="font-bold font-mono">۱۲ دوره</CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs text-muted-foreground">دوره‌های باز</CardTitle>
                    </CardHeader>
                    <CardContent className="font-bold font-mono">
                      {toFaDigits(openPeriodIndices.size)} دوره
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-sm">
                  با کلیک روی دکمه اتمام، سال مالی و دوره‌ها در سامانه ثبت شده و ثبت سند آغاز
                  می‌گردد.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || isSubmitting}
          >
            قبلی
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 2 && openPeriodIndices.size === 0) {
                  toast.error('حداقل یک دوره باید باز بماند');
                  return;
                }
                setStep((s) => s + 1);
              }}
            >
              بعدی
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isSubmitting}>
              {isSubmitting ? 'در حال ثبت راه‌اندازی…' : 'اتمام و ثبت نهایی'}
            </Button>
          )}
        </div>
      </div>
    </SectionLayout>
  );
}
