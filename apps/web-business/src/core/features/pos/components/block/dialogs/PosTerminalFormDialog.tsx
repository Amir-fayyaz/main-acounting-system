'use client';

import { AlertCircle, Info } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';
import { Notice } from '../../../../shared';
import type {
  CreatePosTerminalRequest,
  PosTerminal,
} from '../../../assets/@types/pos-terminal.types';
import { usePosTerminalForm } from '../../../hook/usePosTerminalForm';
import { PosTerminalFormFields } from './PosTerminalFormFields';

interface PosTerminalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createTerminal: (payload: CreatePosTerminalRequest) => Promise<PosTerminal>;
  onSaved: (terminal: PosTerminal) => void | Promise<void>;
}

export function PosTerminalFormDialog({
  open,
  onOpenChange,
  createTerminal,
  onSaved,
}: PosTerminalFormDialogProps) {
  const handleValidSubmit = async (payload: CreatePosTerminalRequest): Promise<void> => {
    const created = await createTerminal(payload);
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
        <Notice icon={<Info className="size-4" />}>
          شماره ترمینال باید یکتا باشد؛ بررسی نهایی سمت سرور انجام می‌شود. دستگاه جدید با وضعیت
          «فعال» ثبت می‌شود.
        </Notice>

        {formError ? (
          <Notice tone="danger" icon={<AlertCircle className="size-4" />}>
            {formError}
          </Notice>
        ) : null}

        <PosTerminalFormFields values={values} errors={errors} setField={setField} />

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
