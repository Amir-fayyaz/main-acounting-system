'use client';

import { AlertCircle, Info } from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';
import { Button } from '@repo/web/ui';
import { Notice } from '../../../../shared';
import type {
  Cheque,
  ChequeFormRules,
  CreateChequeRequest,
} from '../../../assets/@types/cheque.types';
import { useChequeForm } from '../../../hook/useChequeForm';
import type { SaveCheque } from '../../../hook/useSaveCheque';
import { createDefaultChequeDates } from '../../../lib/cheque-form.values';
import { ChequeFormFields } from './ChequeFormFields';

interface ChequeFormContentProps {
  mode: 'create' | 'edit';
  cheque?: Cheque | null;
  rules: ChequeFormRules;
  saveCheque: SaveCheque;
  onOpenChange: (open: boolean) => void;
  onSaved: (cheque: Cheque) => void | Promise<void>;
}

export function ChequeFormContent({
  mode,
  cheque,
  rules,
  saveCheque,
  onOpenChange,
  onSaved,
}: ChequeFormContentProps) {
  const didInitializeDefaultDates = useRef(false);

  const handleValidSubmit = async (payload: CreateChequeRequest): Promise<void> => {
    const saved = await saveCheque(payload, mode, cheque ?? null);
    await onSaved(saved);
  };

  const { values, errors, formError, isSubmitting, setField, submit } = useChequeForm({
    cheque: mode === 'edit' ? cheque : null,
    rules,
    onValidSubmit: handleValidSubmit,
  });

  useEffect(() => {
    if (mode !== 'create' || didInitializeDefaultDates.current) return;

    didInitializeDefaultDates.current = true;

    const dates = createDefaultChequeDates();
    setField('registeredDate', dates.registeredDate);
    setField('dueDate', dates.dueDate);
  }, [mode, setField]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isSaved = await submit();
    if (isSaved) onOpenChange(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-label="فرم چک">
      <Notice icon={<Info className="size-4" />}>
        {rules.duplicateNumberScope === 'global'
          ? 'شماره چک و شناسه صیادی در کل سامانه باید یکتا باشند. قواعد شماره و شناسه از سرور خوانده می‌شود.'
          : 'شماره چک در هر بانک و شناسه صیادی در کل سامانه باید یکتا باشد. قواعد شماره و شناسه از سرور خوانده می‌شود.'}
      </Notice>

      {formError ? (
        <Notice tone="danger" icon={<AlertCircle className="size-4" />}>
          {formError}
        </Notice>
      ) : null}

      <ChequeFormFields
        mode={mode}
        values={values}
        errors={errors}
        rules={rules}
        setField={setField}
      />

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
