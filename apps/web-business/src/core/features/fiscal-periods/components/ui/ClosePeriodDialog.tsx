'use client';

import { useState } from 'react';
import { CiWarning } from 'react-icons/ci';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/web';

import type { FiscalPeriod } from '../../assets/@types';
import { toFaDigits } from '../../utils/fiscal-date';

export interface ClosePeriodDialogProps {
  period: FiscalPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (period: FiscalPeriod) => Promise<void>;
}

export function ClosePeriodDialog({
  period,
  open,
  onOpenChange,
  onConfirm,
}: ClosePeriodDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!period) return null;

  const handleClose = async () => {
    if (!confirmed) return;
    setIsSubmitting(true);
    try {
      await onConfirm(period);
      onOpenChange(false);
      setConfirmed(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>بستن دوره‌ی {period.name}</DialogTitle>
          <DialogDescription>
            بازه‌ی {toFaDigits(period.from)} تا {toFaDigits(period.to)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="flex gap-2.5 p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <CiWarning className="size-5 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              پس از بستن، <strong>ثبت یا ویرایش مستقیم</strong> سند، فاکتور، دریافت و پرداخت با
              تاریخ این دوره مجاز نیست. تغییر فقط با بازگشایی کنترل‌شده ممکن است.
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>متوجه‌ام و بستن دوره را تأیید می‌کنم</span>
          </label>
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
          <Button
            type="button"
            variant="destructive"
            disabled={!confirmed || isSubmitting}
            onClick={handleClose}
          >
            {isSubmitting ? 'در حال بستن…' : 'بستن دوره'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
