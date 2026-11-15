'use client';

import { Input } from '@repo/web/ui';

import type {
  PosTerminalFormErrors,
  PosTerminalFormValues,
} from '../../../assets/@types/pos-terminal.types';
import { PosField } from '../../ui/PosField';

const CONTROL_CLASS = 'text-start tabular-nums';

interface PosTerminalFormFieldsProps {
  values: PosTerminalFormValues;
  errors: PosTerminalFormErrors;
  setField: <TField extends keyof PosTerminalFormValues>(
    field: TField,
    value: PosTerminalFormValues[TField],
  ) => void;
}

export function PosTerminalFormFields({
  values,
  errors,
  setField,
}: PosTerminalFormFieldsProps) {
  const titleId = 'create-pos-title';
  const terminalId = 'create-pos-terminal';
  const merchantId = 'create-pos-merchant';
  const bankId = 'create-pos-bank';
  const feeId = 'create-pos-fee';

  return (
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
  );
}
