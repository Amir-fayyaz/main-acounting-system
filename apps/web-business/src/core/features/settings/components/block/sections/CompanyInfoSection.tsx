'use client';

import Link from 'next/link';

import {
  Badge,
  Button,
  Input,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Small,
} from '@repo/web';
import { CalendarDays } from 'lucide-react';

import type {
  CompanyErrors,
  CompanyInfo,
  Currency,
  FiscalSummary,
  PeriodStatus,
} from '../../../assets/@types/settings';
import { SettingsField } from '../../ui/SettingsField';

const CURRENCY_OPTIONS: ReadonlyArray<{ value: Currency; label: string }> = [
  { value: 'IRR', label: 'ریال (IRR)' },
  { value: 'TOMAN', label: 'تومان' },
];

const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  open: 'باز',
  closed: 'بسته',
  'no-period': 'بدون دوره',
};

const PERIOD_STATUS_VARIANT: Record<PeriodStatus, 'success' | 'secondary'> = {
  open: 'success',
  closed: 'secondary',
  'no-period': 'secondary',
};

export type CompanyInfoSectionProps = {
  value: CompanyInfo;
  fiscal: FiscalSummary;
  errors: CompanyErrors;
  onChange: (patch: Partial<CompanyInfo>) => void;
  disabled: boolean;
};

export function CompanyInfoSection({
  value,
  fiscal,
  errors,
  onChange,
  disabled,
}: CompanyInfoSectionProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsField id="settings-company-name" label="نام شرکت" error={errors.companyName}>
          <Input
            id="settings-company-name"
            value={value.companyName}
            onChange={(event) => onChange({ companyName: event.target.value })}
            aria-invalid={errors.companyName ? true : undefined}
            aria-describedby={errors.companyName ? 'settings-company-name-error' : undefined}
            dir="rtl"
            disabled={disabled}
          />
        </SettingsField>

        <SettingsField id="settings-national-id" label="شناسه ملی" error={errors.nationalId}>
          <Input
            id="settings-national-id"
            inputMode="numeric"
            value={value.nationalId}
            onChange={(event) => onChange({ nationalId: event.target.value })}
            aria-invalid={errors.nationalId ? true : undefined}
            aria-describedby={errors.nationalId ? 'settings-national-id-error' : undefined}
            dir="ltr"
            className="text-start"
            disabled={disabled}
          />
        </SettingsField>

        <SettingsField
          id="settings-fiscal-start"
          label="شروع سال مالی"
          error={errors.fiscalYearStart}
        >
          <Input
            id="settings-fiscal-start"
            value={value.fiscalYearStart}
            readOnly
            aria-invalid={errors.fiscalYearStart ? true : undefined}
            aria-describedby={errors.fiscalYearStart ? 'settings-fiscal-start-error' : undefined}
            dir="ltr"
            className="text-start"
          />
        </SettingsField>

        <SettingsField id="settings-currency" label="واحد پول" error={errors.currency}>
          <Select
            value={value.currency}
            onValueChange={(next) => onChange({ currency: next as Currency })}
            disabled={disabled}
          >
            <SelectTrigger id="settings-currency" aria-label="واحد پول" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-5 rounded-sm bg-muted p-3.5">
        <div>
          <Small className="block text-xs font-normal text-muted-foreground">سال مالی</Small>
          <Small className="font-medium">{fiscal.yearTitle}</Small>
        </div>

        <div>
          <Small className="block text-xs font-normal text-muted-foreground">دوره‌ی جاری</Small>
          <Small className="font-medium">{fiscal.periodName}</Small>
        </div>

        <div>
          <Small className="block text-xs font-normal text-muted-foreground">وضعیت</Small>
          <Badge variant={PERIOD_STATUS_VARIANT[fiscal.periodStatus]} className="text-xs">
            {PERIOD_STATUS_LABELS[fiscal.periodStatus]}
          </Badge>
        </div>

        <Button asChild variant="outline" size="sm" className="ms-auto">
          <Link href="/fiscal-periods">
            <CalendarDays className="size-4" aria-hidden="true" />
            مدیریت سال و دوره‌های مالی
          </Link>
        </Button>
      </div>

      {fiscal.warning ? (
        <div className="mt-3 rounded-sm bg-accent p-3">
          <P className="text-xs text-accent-foreground">{fiscal.warning}</P>
        </div>
      ) : null}
    </>
  );
}
