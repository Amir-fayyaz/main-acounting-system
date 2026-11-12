'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  InputErrorMassage,
  Small,
  Textarea,
} from '@repo/web';

import type { CreatePurchaseInput } from '../../../assets/@types/purchase';
import {
  validatePurchaseForm,
  type PurchaseFormErrors,
} from '../../../lib/purchases.validation';

type FieldName = keyof CreatePurchaseInput;

type FormErrors = PurchaseFormErrors;

const INITIAL_VALUES: CreatePurchaseInput = {
  supplier: '',
  total: '',
  discountPercent: '0',
  due: '',
  description: '',
};

const FIELD_LABELS: Record<FieldName, string> = {
  supplier: 'تأمین‌کننده',
  total: 'مبلغ ناخالص (ریال)',
  discountPercent: 'درصد تخفیف',
  due: 'سررسید پرداخت',
  description: 'شرح',
};

const FORM_ID = 'add-purchase-form';

export type AddPurchaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreatePurchaseInput) => Promise<void>;
};

export function AddPurchaseDialog({ open, onOpenChange, onCreate }: AddPurchaseDialogProps) {
  const [values, setValues] = useState<CreatePurchaseInput>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setValues(INITIAL_VALUES);
    setErrors({});
    setFormError(undefined);
    setSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function handleChange(field: Exclude<FieldName, 'description'>, event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setValues((previous) => ({ ...previous, [field]: nextValue }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validatePurchaseForm(values);
    setErrors(nextErrors);
    setFormError(undefined);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onCreate({
        supplier: values.supplier.trim(),
        total: values.total.trim(),
        discountPercent: values.discountPercent.trim() || '0',
        due: values.due.trim(),
        description: values.description.trim(),
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      setSubmitting(false);
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'ثبت فاکتور خرید با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="print:hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>فاکتور خرید جدید</DialogTitle>
          <DialogDescription>اطلاعات فاکتور خرید را وارد کنید.</DialogDescription>
        </DialogHeader>

        <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="grid gap-4">
          {formError ? <InputErrorMassage role="alert">{formError}</InputErrorMassage> : null}

          <div className="grid gap-2">
            <Small className="font-medium">{FIELD_LABELS.supplier}</Small>
            <Input
              id="purchase-supplier"
              name="supplier"
              type="text"
              value={values.supplier}
              onChange={(event) => handleChange('supplier', event)}
              aria-label={FIELD_LABELS.supplier}
              aria-invalid={errors.supplier ? true : undefined}
              disabled={submitting}
            />
            {errors.supplier ? (
              <InputErrorMassage role="alert">{errors.supplier}</InputErrorMassage>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">{FIELD_LABELS.total}</Small>
            <Input
              id="purchase-total"
              name="total"
              type="text"
              inputMode="numeric"
              value={values.total}
              onChange={(event) => handleChange('total', event)}
              aria-label={FIELD_LABELS.total}
              aria-invalid={errors.total ? true : undefined}
              disabled={submitting}
            />
            {errors.total ? <InputErrorMassage role="alert">{errors.total}</InputErrorMassage> : null}
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">{FIELD_LABELS.discountPercent}</Small>
            <Input
              id="purchase-pct"
              name="discountPercent"
              type="text"
              inputMode="numeric"
              value={values.discountPercent}
              onChange={(event) => handleChange('discountPercent', event)}
              aria-label={FIELD_LABELS.discountPercent}
              aria-invalid={errors.discountPercent ? true : undefined}
              disabled={submitting}
            />
            {errors.discountPercent ? (
              <InputErrorMassage role="alert">{errors.discountPercent}</InputErrorMassage>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">{FIELD_LABELS.due}</Small>
            <Input
              id="purchase-due"
              name="due"
              type="text"
              value={values.due}
              onChange={(event) => handleChange('due', event)}
              placeholder="مثلاً: ۱۴۰۵/۰۸/۰۱"
              aria-label={FIELD_LABELS.due}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">{FIELD_LABELS.description}</Small>
            <Textarea
              id="purchase-desc"
              name="description"
              value={values.description}
              onChange={(event) =>
                setValues((previous) => ({ ...previous, description: event.target.value }))
              }
              aria-label={FIELD_LABELS.description}
              disabled={submitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              انصراف
            </Button>
            <Button type="submit" form={FORM_ID} disabled={submitting}>
              {submitting ? 'ذخیره…' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
