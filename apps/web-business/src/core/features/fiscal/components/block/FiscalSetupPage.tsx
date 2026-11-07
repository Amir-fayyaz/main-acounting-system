'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  SectionLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from '@repo/web/ui';
import { months, setupSteps } from '../../assets/mock/fiscal-data';

const currentYear = 1405;
const faTwoDigits = (value: number) =>
  value.toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });

export function FiscalSetupPage() {
  const [step, setStep] = useState(0);
  const [yearTitle, setYearTitle] = useState(`سال مالی ${currentYear.toLocaleString('fa-IR')}`);
  const [yearFrom, setYearFrom] = useState(`${currentYear.toLocaleString('fa-IR')}/۰۱/۰۱`);
  const [yearTo, setYearTo] = useState(`${currentYear.toLocaleString('fa-IR')}/۱۲/۲۹`);
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('monthly');
  const [openPeriods, setOpenPeriods] = useState<number[]>([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const periods = useMemo(
    () =>
      periodType === 'monthly'
        ? months.map((month, index) => ({
            name: `${month} ${currentYear.toLocaleString('fa-IR')}`,
            from: `${yearFrom.split('/')[0]}/${faTwoDigits(index + 1)}/۰۱`,
            to: `${yearFrom.split('/')[0]}/${faTwoDigits(index + 1)}/${index === 11 ? '۲۹' : '۳۰'}`,
          }))
        : ['بهار', 'تابستان', 'پاییز', 'زمستان'].map((season, index) => ({
            name: `${season} ${currentYear.toLocaleString('fa-IR')}`,
            from: `${yearFrom.split('/')[0]}/${faTwoDigits(index * 3 + 1)}/۰۱`,
            to: `${yearFrom.split('/')[0]}/${faTwoDigits(index * 3 + 3)}/۳۰`,
          })),
    [periodType, yearFrom],
  );

  function finishSetup() {
    localStorage.setItem('fiscal-setup-complete', 'true');
    setStep(4);
  }

  if (step === 4) {
    return (
      <SectionLayout>
        <div className="space-y-6" dir="rtl">
          <header className="space-y-2">
            <p className="text-sm text-muted-foreground">تنظیمات مالی</p>
            <h1 className="text-2xl font-semibold tracking-tight">راه‌اندازی مالی</h1>
          </header>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Badge variant="outline">آماده ثبت اطلاعات</Badge>
                <h2 className="text-xl font-semibold">راه‌اندازی مالی کامل شد</h2>
                <p className="text-sm text-muted-foreground">
                  سال مالی و دوره‌های انتخاب‌شده ذخیره شدند. اکنون می‌توانید تنظیمات سال‌ها را
                  مشاهده کنید.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Summary label="سال مالی" value={yearTitle} />
                <Summary label="تعداد دوره‌ها" value={periods.length.toLocaleString('fa-IR')} />
                <Summary label="دوره‌های باز" value={openPeriods.length.toLocaleString('fa-IR')} />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/fiscal-years">مدیریت سال‌های مالی</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">رفتن به داشبورد</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout>
      <div className="space-y-6" dir="rtl">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">
            تنظیمات مالی <span aria-hidden="true">/</span> راه‌اندازی
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">راه‌اندازی مالی</h1>
          <p className="text-sm text-muted-foreground">
            سال مالی و دوره‌های ثبت اسناد شرکت را تنظیم کنید.
          </p>
        </header>
        <Card className="gap-0 py-0">
          <CardHeader className="gap-0 px-4 py-5 sm:px-6">
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="مراحل راه‌اندازی">
              {setupSteps.map((label, index) => (
                <li
                  key={label}
                  aria-current={index === step ? 'step' : undefined}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full border ${index < step ? 'border-primary bg-primary text-primary-foreground' : index === step ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    {index < step ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      (index + 1).toLocaleString('fa-IR')
                    )}
                  </span>
                  <span className={index === step ? 'font-medium' : 'text-muted-foreground'}>
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-6 px-4 py-6 sm:px-6">
            {step === 0 && (
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-semibold">تعریف سال مالی</h2>
                  <p className="text-sm text-muted-foreground">
                    بازه سال مالی را مشخص کنید. همه تاریخ‌های این بخش نمونه و قابل تغییر هستند.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm sm:col-span-2">
                    عنوان سال مالی
                    <Input
                      value={yearTitle}
                      onChange={(event) => setYearTitle(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    از تاریخ
                    <Input
                      value={yearFrom}
                      onChange={(event) => setYearFrom(event.target.value)}
                      dir="ltr"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    تا تاریخ
                    <Input
                      value={yearTo}
                      onChange={(event) => setYearTo(event.target.value)}
                      dir="ltr"
                    />
                  </label>
                </div>
              </section>
            )}
            {step === 1 && (
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-semibold">ایجاد دوره‌ها</h2>
                  <p className="text-sm text-muted-foreground">
                    سال را به دوره‌های ماهانه یا فصلی تقسیم کنید و پیش‌نمایش را بررسی کنید.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label htmlFor="period-type" className="text-sm font-medium">
                    تقسیم سال به
                  </label>
                  <Select
                    value={periodType}
                    onValueChange={(value) => setPeriodType(value as 'monthly' | 'quarterly')}
                  >
                    <SelectTrigger id="period-type" className="sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">ماهانه</SelectItem>
                      <SelectItem value="quarterly">فصلی</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline">
                    {periods.length.toLocaleString('fa-IR')} دوره پیشنهادی
                  </Badge>
                </div>
                <div className="overflow-x-auto rounded-sm border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="p-3 text-right font-medium">دوره</th>
                        <th className="p-3 text-right font-medium">از تاریخ</th>
                        <th className="p-3 text-right font-medium">تا تاریخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((period) => (
                        <tr key={period.name} className="border-b border-border last:border-0">
                          <td className="p-3 font-medium">{period.name}</td>
                          <td className="p-3 tabular-nums">{period.from}</td>
                          <td className="p-3 tabular-nums">{period.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {step === 2 && (
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-semibold">انتخاب دوره‌های باز</h2>
                  <p className="text-sm text-muted-foreground">
                    ثبت سند در دوره‌های بسته ممکن نیست. دوره‌های انتخاب‌شده به‌صورت باز ساخته
                    می‌شوند.
                  </p>
                </div>
                <div className="divide-y divide-border rounded-sm border border-border">
                  {periods.map((period, index) => (
                    <label
                      key={period.name}
                      className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3"
                    >
                      <span>
                        <span className="block font-medium">{period.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {period.from} تا {period.to}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Badge variant="outline">
                          {openPeriods.includes(index) ? 'باز' : 'بسته'}
                        </Badge>
                        <Switch
                          checked={openPeriods.includes(index)}
                          aria-label={`باز بودن ${period.name}`}
                          onCheckedChange={(checked) =>
                            setOpenPeriods((current) =>
                              checked
                                ? [...current, index].sort((a, b) => a - b)
                                : current.filter((item) => item !== index),
                            )
                          }
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}
            {step === 3 && (
              <section className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-semibold">مرور و اتمام</h2>
                  <p className="text-sm text-muted-foreground">
                    پیش از نهایی‌کردن، اطلاعات سال و دوره‌های مالی را بررسی کنید.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Summary label="سال مالی" value={yearTitle} />
                  <Summary label="تعداد دوره‌ها" value={periods.length.toLocaleString('fa-IR')} />
                  <Summary
                    label="دوره‌های باز"
                    value={openPeriods.length.toLocaleString('fa-IR')}
                  />
                </div>
                <p className="rounded-sm border border-border bg-muted p-4 text-sm text-muted-foreground">
                  با اتمام راه‌اندازی، سال و دوره‌ها ایجاد می‌شوند و ثبت سند در دوره‌های باز ممکن
                  خواهد بود.
                </p>
              </section>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <Button
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((current) => current - 1)}
              >
                <ChevronRight aria-hidden="true" /> قبلی
              </Button>
              <Button
                disabled={step === 0 && !yearTitle.trim()}
                onClick={() => (step === 3 ? finishSetup() : setStep((current) => current + 1))}
              >
                {step === 3 ? 'اتمام و ورود به داشبورد' : 'بعدی'}
                {step < 3 && <ChevronLeft aria-hidden="true" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SectionLayout>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2 rounded-sm border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
