'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button, P, Span, Textarea } from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';

import type { FiscalPeriod } from '../../../assets/@types/fiscal-periods.types';
import { validateReopenReason } from '../../../lib/fiscal-period.validation';
import { formatJalaliDate } from '../../../utils/format';
import { FiscalField } from '../../ui/FiscalField';
import { FiscalNotice } from '../../ui/FiscalNotice';

interface ReopenFiscalPeriodDialogProps {
  period: FiscalPeriod | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (periodId: string, reason: string) => void;
}

export function ReopenFiscalPeriodDialog({
  period,
  onOpenChange,
  onConfirm,
}: ReopenFiscalPeriodDialogProps) {
  const [reason, setReason] = useState('');
  const [isAcknowledged, setAcknowledged] = useState(false);
  const [isSubmitted, setSubmitted] = useState(false);

  const reasonError = validateReopenReason(reason);
  const visibleError = isSubmitted ? reasonError : null;
  const canSubmit = !reasonError && isAcknowledged;

  return (
    <Modal
      open={Boolean(period)}
      onOpenChange={onOpenChange}
      size="md"
      title={period ? `بازگشایی دوره‌ی ${period.name}` : 'بازگشایی دوره'}
      description={
        period ? `${formatJalaliDate(period.from)} تا ${formatJalaliDate(period.to)}` : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              setSubmitted(true);
              if (!period || reasonError) return;

              onConfirm(period.id, reason);
            }}
          >
            بازگشایی دوره
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FiscalNotice tone="danger" icon={<ShieldAlert className="size-4" />}>
          بازگشایی دوره‌ی بسته عملیاتی حساس است و همراه با دلیل در تاریخچه‌ی ممیزی ثبت می‌شود.
        </FiscalNotice>
        <P className="text-muted-foreground text-sm">
          این عملیات نیازمند مجوز «بازگشایی دوره مالی» است. دسترسی شما: مدیر مالی ✓
        </P>

        <FiscalField
          id="fiscal-period-reopen-reason"
          label="دلیل بازگشایی دلیل بازگشایی (الزامی، حداقل ۱۰ حرف)"
          hint="حداقل ۱۰ حرف؛ این متن در تاریخچه‌ی دوره ثبت می‌شود."
          error={visibleError}
        >
          <Textarea
            id="fiscal-period-reopen-reason"
            className="min-h-24 resize-y"
            placeholder="مثلا اصلاح سند 1405042 که با تاریخ اشتباه ثبت شده است"
            value={reason}
            aria-invalid={Boolean(visibleError)}
            onChange={(event) => setReason(event.target.value)}
          />
        </FiscalField>

        <label className="flex items-start gap-2 rounded-lg justify-between px-3 py-2.5 text-xs leading-6 text-foreground sm:text-sm">
          <Span>این بازگشایی را تأیید می‌کنم و می‌دانم در ممیزی ثبت می‌شود.</Span>
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
