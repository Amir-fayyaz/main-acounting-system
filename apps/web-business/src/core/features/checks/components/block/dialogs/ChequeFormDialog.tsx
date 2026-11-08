'use client';

import { AlertCircle, Info, RotateCcw } from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';

import {
  type Cheque,
  type ChequeDirection,
  type ChequeFormRules,
  type CreateChequeRequest,
} from '../../../assets/@types/cheque.types';
import { useChequeForm } from '../../../hook/useChequeForm';
import { useChequeFormRules } from '../../../hook/useChequeFormRules';
import { CHEQUE_BANKS, CHEQUE_DIRECTION_OPTIONS } from '../../../lib/checks.config';
import { checksApi } from '../../../lib/checks-api';
import { createDefaultChequeDates } from '../../../lib/cheque-form.mapper';
import { ChequeField } from '../../ui/ChequeField';
import { ChequeNotice } from '../../ui/ChequeNotice';
import { SayadField } from '../../ui/SayadField';

export type ChequeFormDialogMode = 'create' | 'edit';

interface ChequeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ChequeFormDialogMode;
  cheque?: Cheque | null;
  onSaved: (cheque: Cheque) => void | Promise<void>;
}

interface ChequeFormContentProps {
  mode: ChequeFormDialogMode;
  cheque?: Cheque | null;
  rules: ChequeFormRules;
  onOpenChange: (open: boolean) => void;
  onSaved: ChequeFormDialogProps['onSaved'];
}

const CONTROL_CLASS = 'text-start tabular-nums';

function ChequeFormContent({ mode, cheque, rules, onOpenChange, onSaved }: ChequeFormContentProps) {
  const didInitDates = useRef(false);

  const handleValidSubmit = async (payload: CreateChequeRequest): Promise<void> => {
    if (mode === 'edit' && cheque) {
      const updated = await checksApi.update({
        ...payload,
        id: cheque.id,
        expectedRevision: cheque.revision,
      });
      await onSaved(updated);

      return;
    }

    const created = await checksApi.create(payload);
    await onSaved(created);
  };

  const { values, errors, formError, isSubmitting, setField, submit } = useChequeForm({
    cheque: mode === 'edit' ? cheque : null,
    rules,
    onValidSubmit: handleValidSubmit,
  });

  // تاریخ‌های پیش‌فرض فقط بعد از mount پر می‌شوند تا SSR/CSR یکسان بمانند.
  useEffect(() => {
    if (mode !== 'create' || didInitDates.current) return;
    didInitDates.current = true;
    const dates = createDefaultChequeDates();
    setField('registeredDate', dates.registeredDate);
    setField('dueDate', dates.dueDate);
  }, [mode, setField]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isSaved = await submit();
    if (isSaved) onOpenChange(false);
  };

  const numberId = `${mode}-cheque-number`;
  const sayadId = `${mode}-cheque-sayad`;
  const directionId = `${mode}-cheque-direction`;
  const counterpartyId = `${mode}-cheque-counterparty`;
  const bankId = `${mode}-cheque-bank`;
  const amountId = `${mode}-cheque-amount`;
  const registeredDateId = `${mode}-cheque-registered-date`;
  const dueDateId = `${mode}-cheque-due-date`;

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-label="فرم چک">
      <ChequeNotice icon={<Info className="size-4" />}>
        شماره چک در هر بانک و شناسه صیادی در کل سامانه باید یکتا باشد. قواعد شماره و شناسه از سرور
        خوانده می‌شود.
      </ChequeNotice>

      {formError ? (
        <ChequeNotice tone="danger" icon={<AlertCircle className="size-4" />}>
          {formError}
        </ChequeNotice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ChequeField id={numberId} label="شماره چک" error={errors.number}>
          <Input
            id={numberId}
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            className={CONTROL_CLASS}
            maxLength={rules.chequeNumber.maxLength}
            value={values.number}
            aria-invalid={Boolean(errors.number)}
            onChange={(event) => {
              setField('number', event.target.value);
            }}
          />
        </ChequeField>

        <ChequeField id={sayadId} label="شناسه صیادی" error={errors.sayadId}>
          <SayadField
            id={sayadId}
            expectedLength={rules.sayad.length}
            value={values.sayadId}
            aria-invalid={Boolean(errors.sayadId)}
            onValueChange={(value) => {
              setField('sayadId', value);
            }}
          />
        </ChequeField>

        <ChequeField id={directionId} label="نوع چک" error={errors.direction}>
          <Select
            value={values.direction}
            onValueChange={(value) => {
              setField('direction', value as ChequeDirection);
            }}
          >
            <SelectTrigger
              id={directionId}
              className="w-full"
              aria-label="نوع چک"
              aria-invalid={Boolean(errors.direction)}
              aria-describedby={errors.direction ? `${directionId}-message` : undefined}
            >
              <SelectValue placeholder="انتخاب نوع" />
            </SelectTrigger>
            <SelectContent>
              {CHEQUE_DIRECTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ChequeField>

        <ChequeField id={counterpartyId} label="طرف حساب" error={errors.counterparty}>
          <Input
            id={counterpartyId}
            autoComplete="off"
            value={values.counterparty}
            aria-invalid={Boolean(errors.counterparty)}
            onChange={(event) => {
              setField('counterparty', event.target.value);
            }}
          />
        </ChequeField>

        <ChequeField id={bankId} label="بانک" error={errors.bank}>
          <Select
            value={values.bank}
            onValueChange={(value) => {
              setField('bank', value);
            }}
          >
            <SelectTrigger
              id={bankId}
              className="w-full"
              aria-label="بانک"
              aria-invalid={Boolean(errors.bank)}
              aria-describedby={errors.bank ? `${bankId}-message` : undefined}
            >
              <SelectValue placeholder="انتخاب بانک" />
            </SelectTrigger>
            <SelectContent>
              {CHEQUE_BANKS.map((bank) => (
                <SelectItem key={bank} value={bank}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ChequeField>

        <ChequeField
          id={amountId}
          label="مبلغ (ریال)"
          error={errors.amount}
          hint="مبلغ را فقط با رقم وارد کنید؛ نمونه: ۱۲۵٬۰۰۰٬۰۰۰"
        >
          <Input
            id={amountId}
            dir="ltr"
            inputMode="decimal"
            autoComplete="off"
            className={CONTROL_CLASS}
            value={values.amount}
            aria-invalid={Boolean(errors.amount)}
            onChange={(event) => {
              setField('amount', event.target.value);
            }}
          />
        </ChequeField>

        <ChequeField
          id={registeredDateId}
          label="تاریخ ثبت"
          error={errors.registeredDate}
          hint="شمسی؛ نمونه: ۱۴۰۵/۰۷/۲۷"
        >
          <Input
            id={registeredDateId}
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1405/07/27"
            className={CONTROL_CLASS}
            value={values.registeredDate}
            aria-invalid={Boolean(errors.registeredDate)}
            onChange={(event) => {
              setField('registeredDate', event.target.value);
            }}
          />
        </ChequeField>

        <ChequeField
          id={dueDateId}
          label="تاریخ سررسید"
          error={errors.dueDate}
          hint="باید برابر یا بعد از تاریخ ثبت باشد."
        >
          <Input
            id={dueDateId}
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1405/08/27"
            className={CONTROL_CLASS}
            value={values.dueDate}
            aria-invalid={Boolean(errors.dueDate)}
            onChange={(event) => {
              setField('dueDate', event.target.value);
            }}
          />
        </ChequeField>
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
          {isSubmitting ? 'در حال ذخیره…' : mode === 'edit' ? 'ذخیره تغییرات' : 'ثبت چک'}
        </Button>
      </div>
    </form>
  );
}

export function ChequeFormDialog({
  open,
  onOpenChange,
  mode,
  cheque,
  onSaved,
}: ChequeFormDialogProps) {
  const rulesState = useChequeFormRules();
  const title = mode === 'edit' ? 'ویرایش چک' : 'ثبت چک';
  const description =
    mode === 'edit'
      ? 'شماره چک، شناسه صیادی، مبلغ و تاریخ‌ها را ویرایش کنید.'
      : 'چک جدید را با شماره، شناسه صیادی و تاریخ سررسید ثبت کنید.';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={title}
      description={description}
      hideDefaultFooter
    >
      {rulesState.state.status === 'loading' ? (
        <div className="space-y-4" role="status" aria-label="در حال دریافت قواعد فرم">
          <span className="sr-only">در حال دریافت قواعد فرم…</span>
          <Skeleton className="h-16 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>
      ) : rulesState.state.status === 'error' ? (
        <div className="space-y-4">
          <ChequeNotice tone="danger" icon={<AlertCircle className="size-4" />}>
            {rulesState.state.message}
          </ChequeNotice>
          <Button type="button" variant="outline" className="gap-1.5" onClick={rulesState.retry}>
            <RotateCcw className="size-4" aria-hidden />
            تلاش دوباره
          </Button>
        </div>
      ) : (
        <ChequeFormContent
          mode={mode}
          cheque={cheque}
          rules={rulesState.state.rules}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
