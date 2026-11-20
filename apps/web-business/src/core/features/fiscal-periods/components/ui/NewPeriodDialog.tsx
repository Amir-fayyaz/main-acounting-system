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

import type { FiscalPeriod, FiscalYear } from '../../assets/@types';
import { isValidPersianDate } from '../../utils/fiscal-date';

export interface NewPeriodDialogProps {
  year: FiscalYear | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (periodData: Omit<FiscalPeriod, 'id'>) => Promise<void>;
}

export function NewPeriodDialog({ year, open, onOpenChange, onConfirm }: NewPeriodDialogProps) {
  const [name, setName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!year) return null;

  const isValid =
    name.trim().length > 0 &&
    isValidPersianDate(fromDate) &&
    isValidPersianDate(toDate) &&
    fromDate <= toDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onConfirm({
        yid: year.id,
        name: name.trim(),
        from: fromDate.trim(),
        to: toDate.trim(),
        status: 'open',
      });
      onOpenChange(false);
      setName('');
      setFromDate('');
      setToDate('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>ایجاد دوره‌ی مالی در {year.title}</DialogTitle>
            <DialogDescription>دوره‌ی جدید با وضعیت «باز» ساخته می‌شود.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-sm">
            <div className="space-y-1.5">
              <label htmlFor="period-name" className="text-sm font-medium">
                نام دوره
              </label>
              <Input
                id="period-name"
                placeholder="مثلاً: آبان ۱۴۰۵"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="period-from" className="text-sm font-medium">
                  از تاریخ
                </label>
                <Input
                  id="period-from"
                  placeholder="۱۴۰۵/۰۸/۰۱"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="period-to" className="text-sm font-medium">
                  تا تاریخ
                </label>
                <Input
                  id="period-to"
                  placeholder="۱۴۰۵/۰۸/۳۰"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {fromDate && toDate && fromDate > toDate && (
              <span className="text-xs text-destructive">
                تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.
              </span>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'در حال ایجاد…' : 'ایجاد دوره'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
