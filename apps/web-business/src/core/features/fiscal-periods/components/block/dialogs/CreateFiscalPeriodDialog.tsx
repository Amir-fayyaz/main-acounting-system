'use client';

import { useState } from 'react';
import { Button, Input } from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';

import type {
  FiscalPeriod,
  FiscalPeriodDraft,
  FiscalYear,
} from '../../../assets/@types/fiscal-periods.types';
import { validateFiscalPeriodDraft } from '../../../lib/fiscal-period.validation';
import { FiscalField } from '../../ui/FiscalField';

interface CreateFiscalPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: FiscalYear | null;
  periods: readonly FiscalPeriod[];
  suggestedDraft: FiscalPeriodDraft;
  onSubmit: (draft: FiscalPeriodDraft) => void;
}

export function CreateFiscalPeriodDialog({
  open,
  onOpenChange,
  year,
  periods,
  suggestedDraft,
  onSubmit,
}: CreateFiscalPeriodDialogProps) {
  const [draft, setDraft] = useState<FiscalPeriodDraft>(suggestedDraft);
  const [isSubmitted, setSubmitted] = useState(false);

  const validationError = validateFiscalPeriodDraft(draft, { year, periods });
  const visibleError = isSubmitted ? validationError : null;

  const handleSubmit = () => {
    setSubmitted(true);
    if (validationError) return;

    onSubmit(draft);
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="ایجاد دوره‌ی مالی"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={Boolean(validationError)}>
            ایجاد دوره
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FiscalField id="fiscal-period-name" label="نام دوره" hint="مثلاً آذر ۱۴۰۵">
          <Input
            id="fiscal-period-name"
            value={draft.name}
            aria-invalid={Boolean(visibleError) && !draft.name.trim()}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </FiscalField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FiscalField id="fiscal-period-from" label="از تاریخ" error={visibleError}>
            <Input
              id="fiscal-period-from"
              dir="ltr"
              inputMode="numeric"
              className="text-start tabular-nums"
              value={draft.from}
              aria-invalid={Boolean(visibleError)}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            />
          </FiscalField>

          <FiscalField id="fiscal-period-to" label="تا تاریخ">
            <Input
              id="fiscal-period-to"
              dir="ltr"
              inputMode="numeric"
              className="text-start tabular-nums"
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            />
          </FiscalField>
        </div>
      </div>
    </Modal>
  );
}
