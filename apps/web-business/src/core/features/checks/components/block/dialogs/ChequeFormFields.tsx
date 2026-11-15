'use client';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/web/ui';

import type {
  ChequeDirection,
  ChequeFormErrors,
  ChequeFormRules,
  ChequeFormValues,
} from '../../../assets/@types/cheque.types';
import { CHEQUE_BANKS, CHEQUE_DIRECTION_OPTIONS } from '../../../lib/checks.config';
import { ChequeField } from '../../ui/ChequeField';
import { SayadField } from '../../ui/SayadField';

const CONTROL_CLASS = 'text-start tabular-nums';

interface ChequeFormFieldsProps {
  mode: 'create' | 'edit';
  values: ChequeFormValues;
  errors: ChequeFormErrors;
  rules: ChequeFormRules;
  setField: <TField extends keyof ChequeFormValues>(
    field: TField,
    value: ChequeFormValues[TField],
  ) => void;
}

export function ChequeFormFields({
  mode,
  values,
  errors,
  rules,
  setField,
}: ChequeFormFieldsProps) {
  const numberId = `${mode}-cheque-number`;
  const sayadId = `${mode}-cheque-sayad`;
  const directionId = `${mode}-cheque-direction`;
  const counterpartyId = `${mode}-cheque-counterparty`;
  const bankId = `${mode}-cheque-bank`;
  const amountId = `${mode}-cheque-amount`;
  const registeredDateId = `${mode}-cheque-registered-date`;
  const dueDateId = `${mode}-cheque-due-date`;

  return (
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
  );
}
