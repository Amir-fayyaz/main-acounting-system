'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button, Skeleton } from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';
import { Notice } from '../../../../shared';
import type { Cheque } from '../../../assets/@types/cheque.types';
import { useChequeFormRules } from '../../../hook/useChequeFormRules';
import type { SaveCheque } from '../../../hook/useSaveCheque';
import { ChequeFormContent } from './ChequeFormContent';

export type ChequeFormDialogMode = 'create' | 'edit';

interface ChequeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ChequeFormDialogMode;
  cheque?: Cheque | null;
  saveCheque: SaveCheque;
  onSaved: (cheque: Cheque) => void | Promise<void>;
}

export function ChequeFormDialog({
  open,
  onOpenChange,
  mode,
  cheque,
  saveCheque,
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
          <Notice tone="danger" icon={<AlertCircle className="size-4" />}>
            {rulesState.state.message}
          </Notice>
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
          saveCheque={saveCheque}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
