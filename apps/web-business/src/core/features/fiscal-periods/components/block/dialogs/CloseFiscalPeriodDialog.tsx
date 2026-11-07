'use client';

import { useState } from 'react';
import { Button, Span } from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';

import type { FiscalPeriod } from '../../../assets/@types/fiscal-periods.types';
import { formatJalaliDate } from '../../../utils/format';
import { FiscalNotice } from '../../ui/FiscalNotice';

interface CloseFiscalPeriodDialogProps {
  period: FiscalPeriod | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (periodId: string) => void;
}

export function CloseFiscalPeriodDialog({
  period,
  onOpenChange,
  onConfirm,
}: CloseFiscalPeriodDialogProps) {
  const [isAcknowledged, setAcknowledged] = useState(false);

  return (
    <Modal
      open={Boolean(period)}
      onOpenChange={onOpenChange}
      size="md"
      title={period ? `بستن دوره‌ی ${period.name}` : 'بستن دوره'}
      description={
        period ? `${formatJalaliDate(period.from)} تا ${formatJalaliDate(period.to)}` : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            disabled={!isAcknowledged}
            onClick={() => {
              if (!period) return;
              onConfirm(period.id);
            }}
          >
            بستن دوره
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FiscalNotice tone="warning">
          پس از بستن،
          <Span className="text-xs font-bold sm:text-[13px]"> ثبت یا ویرایش مستقیم</Span> سند،
          فاکتور، دریافت و پرداخت با تاریخ این دوره مجاز نیست. تغییر فقط با بازگشایی کنترل‌شده ممکن
          است.
        </FiscalNotice>

        <label className="flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 text-xs leading-6 text-foreground sm:text-[13px]">
          <Span>متوجه‌ام و بستن دوره را تأیید می‌کنم</Span>
          <input
            type="checkbox"
            className="mt-1.5 size-4 shrink-0 accent-primary"
            checked={isAcknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
        </label>
      </div>
    </Modal>
  );
}
