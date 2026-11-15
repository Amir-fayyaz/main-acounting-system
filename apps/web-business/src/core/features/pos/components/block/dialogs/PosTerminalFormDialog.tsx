'use client';

import { AlertCircle, Info } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button, Input } from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';

import type {
  CreatePosTerminalRequest,
  PosTerminal,
} from '../../../assets/@types/pos-terminal.types';
import { usePosTerminalForm } from '../../../hook/usePosTerminalForm';
import { posApi } from '../../../lib/pos-api';
import { PosField } from '../../ui/PosField';
import { PosNotice } from '../../ui/PosNotice';

interface PosTerminalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (terminal: PosTerminal) => void | Promise<void>;
}

const CONTROL_CLASS = 'text-start tabular-nums';

export function PosTerminalFormDialog({ open, onOpenChange, onSaved }: PosTerminalFormDialogProps) {
  const handleValidSubmit = async (payload: CreatePosTerminalRequest): Promise<void> => {
    const created = await posApi.create(payload);
    await onSaved(created);
  };

  const { values, errors, formError, isSubmitting, setField, submit } = usePosTerminalForm({
    onValidSubmit: handleValidSubmit,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isSaved = await submit();
    if (isSaved) onOpenChange(false);
  };

  const titleId = 'create-pos-title';
  const terminalId = 'create-pos-terminal';
  const merchantId = 'create-pos-merchant';
  const bankId = 'create-pos-bank';
  const feeId = 'create-pos-fee';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="دستگاه جدید"
      description="ترمینال POS جدید را با شماره ترمینال یکتا ثبت کنید."
      hideDefaultFooter
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-label="فرم دستگاه جدید">
        <PosNotice icon={<Info className="size-4" />}>
          شماره ترمینال باید یکتا باشد؛ بررسی نهایی سمت سرور انجام می‌شود. دستگاه جدید با وضعیت
          «فعال» ثبت می‌شود.
        </PosNotice>

        {formError ? (
          <PosNotice tone="danger" icon={<AlertCircle className="size-4" />}>
            {formError}
          </PosNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <PosField id={titleId} label="عنوان دستگاه" error={errors.title}>
            <Input
              id={titleId}
              autoComplete="off"
              value={values.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) => {
                setField('title', event.target.value);
              }}
            />
          </PosField>

          <PosField
            id={terminalId}
            label="شماره ترمینال"
            error={errors.terminalNumber}
            hint="فقط رقم؛ باید در کل سامانه یکتا باشد."
          >
            <Input
              id={terminalId}
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              className={CONTROL_CLASS}
              value={values.terminalNumber}
              aria-invalid={Boolean(errors.terminalNumber)}
              onChange={(event) => {
                setField('terminalNumber', event.target.value);
              }}
            />
          </PosField>

          <PosField
            id={merchantId}
            label="شماره پذیرنده"
            error={errors.merchantNumber}
            hint="اختیاری؛ در صورت ورود فقط رقم."
          >
            <Input
              id={merchantId}
              dir="ltr"
              inputMode="numeric"
              autoComplete="off"
              className={CONTROL_CLASS}
              value={values.merchantNumber}
              aria-invalid={Boolean(errors.merchantNumber)}
              onChange={(event) => {
                setField('merchantNumber', event.target.value);
              }}
            />
          </PosField>

          <PosField id={bankId} label="بانک" error={errors.bank} hint="اختیاری.">
            <Input
              id={bankId}
              autoComplete="off"
              value={values.bank}
              aria-invalid={Boolean(errors.bank)}
              onChange={(event) => {
                setField('bank', event.target.value);
              }}
            />
          </PosField>

          <PosField
            id={feeId}
            label="کارمزد (٪)"
            error={errors.feePercent}
            hint="اختیاری؛ درصدی بین ۰ تا ۱۰۰. نمونه: ۰٫۷"
          >
            <Input
              id={feeId}
              dir="ltr"
              inputMode="decimal"
              autoComplete="off"
              className={CONTROL_CLASS}
              value={values.feePercent}
              aria-invalid={Boolean(errors.feePercent)}
              onChange={(event) => {
                setField('feePercent', event.target.value);
              }}
            />
          </PosField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'در حال ذخیره…' : 'ثبت دستگاه'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
