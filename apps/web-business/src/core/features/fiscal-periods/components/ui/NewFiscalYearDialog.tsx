'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@repo/web';
import type { FiscalYear } from '../../assets/@types';
import { toFaDigits } from '../../utils/fiscal-date';
import {
  getJalaliYearBounds,
  gregorianToJalali,
  jalaliDaysInMonth,
} from '../../utils/fiscal-calendar';

export interface NewFiscalYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingYears: FiscalYear[];
  onConfirm: (params: {
    title: string;
    jalaliYear: number;
    from: string;
    to: string;
    autoGeneratePeriods: boolean;
  }) => Promise<void>;
}

export function NewFiscalYearDialog({
  open,
  onOpenChange,
  existingYears,
  onConfirm,
}: NewFiscalYearDialogProps) {
  const currentJalaliYear = gregorianToJalali(new Date().toISOString().slice(0, 10)).jYear;

  // Find highest year or default to current + 1
  const existingJYears = existingYears
    .map((y) => {
      const match = y.title.match(/\d{4}/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter((n) => n > 0);

  const initialYear =
    existingJYears.length > 0 ? Math.max(...existingJYears) + 1 : currentJalaliYear;

  const [jalaliYear, setJalaliYear] = useState<number>(initialYear);
  const [title, setTitle] = useState<string>(`سال مالی ${toFaDigits(initialYear)}`);
  const [autoGenerate, setAutoGenerate] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const nextY = existingJYears.length > 0 ? Math.max(...existingJYears) + 1 : currentJalaliYear;
      setJalaliYear(nextY);
      setTitle(`سال مالی ${toFaDigits(nextY)}`);
      setAutoGenerate(true);
    }
    onOpenChange(nextOpen);
  };

  const lastDay = jalaliDaysInMonth(jalaliYear, 12);
  const fromDisplay = `${toFaDigits(jalaliYear)}/۰۱/۰۱`;
  const toDisplay = `${toFaDigits(jalaliYear)}/۱۲/${toFaDigits(lastDay)}`;

  // Validation
  const trimmedTitle = title.trim();
  const isDuplicateLabel = existingYears.some(
    (y) => y.title.trim().toLowerCase() === trimmedTitle.toLowerCase(),
  );

  const bounds = getJalaliYearBounds(jalaliYear);
  const isOverlapping = existingYears.some((y) => {
    if (!y.startDateIso || !y.endDateIso) return false;
    return !(bounds.endDate < y.startDateIso || bounds.startDate > y.endDateIso);
  });

  const isValid =
    trimmedTitle.length > 0 &&
    jalaliYear >= 1300 &&
    jalaliYear <= 1500 &&
    !isDuplicateLabel &&
    !isOverlapping;

  const handleYearChange = (newYearNum: number) => {
    setJalaliYear(newYearNum);
    setTitle(`سال مالی ${toFaDigits(newYearNum)}`);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Parse 4 digits (ascii or persian)
    const normalized = newTitle.replace(/[۰-۹]/g, (d) =>
      String(['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'].indexOf(d)),
    );
    const match = normalized.match(/\d{4}/);
    if (match) {
      const parsedYear = parseInt(match[0], 10);
      if (parsedYear >= 1300 && parsedYear <= 1500) {
        setJalaliYear(parsedYear);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        title: trimmedTitle,
        jalaliYear,
        from: fromDisplay,
        to: toDisplay,
        autoGeneratePeriods: autoGenerate,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>سال مالی جدید</DialogTitle>
            <DialogDescription>
              تعریف سال مالی جدید و تولید خودکار ۱۲ دوره‌ی ماهانه
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="year-select" className="text-sm font-medium">
                سال هجری شمسی
              </label>
              <Input
                id="year-select"
                type="number"
                min={1380}
                max={1450}
                value={jalaliYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10) || jalaliYear)}
                disabled={isSubmitting}
                className="font-mono tabular-nums"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="year-title" className="text-sm font-medium">
                عنوان سال مالی
              </label>
              <Input
                id="year-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="مثلاً: سال مالی ۱۴۰۶"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">از تاریخ</span>
                <div className="p-2 rounded bg-muted/60 text-sm font-mono tabular-nums border border-border">
                  {fromDisplay}
                </div>
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground font-medium">تا تاریخ</span>
                <div className="p-2 rounded bg-muted/60 text-sm font-mono tabular-nums border border-border">
                  {toDisplay}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <input
                id="auto-gen"
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                disabled={isSubmitting}
                className="rounded border-border text-primary size-4"
              />
              <label htmlFor="auto-gen" className="text-sm cursor-pointer select-none">
                ساخت خودکار ۱۲ دوره‌ی ماهانه در این سال
              </label>
            </div>

            {isDuplicateLabel && (
              <p className="text-xs text-destructive">
                عنوان سال مالی تکراری است. لطفاً عنوان دیگری انتخاب کنید.
              </p>
            )}

            {isOverlapping && (
              <p className="text-xs text-destructive">
                این سال مالی با یکی از سال‌های مالی ثبت‌شده هم‌پوشانی دارد.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'در حال ایجاد…' : 'ایجاد سال مالی'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
