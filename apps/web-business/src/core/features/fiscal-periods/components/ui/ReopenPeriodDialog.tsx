'use client';

import { useState } from 'react';
import { CiCircleAlert } from 'react-icons/ci';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@repo/web';

import type { FiscalPeriod } from '../../assets/@types';

export interface ReopenPeriodDialogProps {
  period: FiscalPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (period: FiscalPeriod, reason: string) => Promise<void>;
}

export function ReopenPeriodDialog({
  period,
  open,
  onOpenChange,
  onConfirm,
}: ReopenPeriodDialogProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!period) return null;

  const isValid = confirmed && reason.trim().length >= 10;

  const handleReopen = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      await onConfirm(period, reason.trim());
      onOpenChange(false);
      setReason('');
      setConfirmed(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>بازگشایی دوره‌ی {period.name}</DialogTitle>
          <DialogDescription>
            عملیات بازگشایی نیازمند ثبت دلیل در ممیزی سیستم است.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="flex gap-2.5 p-3 rounded-md bg-accent text-accent-foreground border border-border">
            <CiCircleAlert className="size-5 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              بازگشایی دوره‌ی بسته عملیاتی حساس است و همراه با دلیل در تاریخچه‌ی ممیزی ثبت می‌شود.
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            این عملیات نیازمند مجوز «بازگشایی دوره مالی» است. دسترسی شما: مدیر مالی ✓
          </p>

          <div className="space-y-1.5">
            <label htmlFor="reopen-reason" className="text-sm font-medium">
              دلیل بازگشایی (الزامی، حداقل ۱۰ حرف)
            </label>
            <Textarea
              id="reopen-reason"
              rows={3}
              placeholder="مثلاً: اصلاح سند ۱۴۰۵۰۴۲ که با تاریخ اشتباه ثبت شده است"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {reason.length > 0 && reason.trim().length < 10 && (
              <span className="text-xs text-destructive">حداقل ۱۰ حرف وارد کنید.</span>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>پیامدهای بازگشایی را می‌دانم و تأیید می‌کنم</span>
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
            disabled={!isValid || isSubmitting}
            onClick={handleReopen}
          >
            {isSubmitting ? 'در حال بازگشایی…' : 'بازگشایی دوره'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
