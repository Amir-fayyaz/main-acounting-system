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
} from '@repo/web';

import type { CreateBranchInput } from '../../../assets/@types/branch';

type FieldName = keyof CreateBranchInput;

type FormErrors = Partial<Record<FieldName, string>>;

const INITIAL_VALUES: CreateBranchInput = {
  code: '',
  name: '',
  managerName: '',
};

const FIELD_LABELS: Record<FieldName, string> = {
  code: 'کد شعبه',
  name: 'نام شعبه',
  managerName: 'مدیر شعبه',
};

const FIELD_PLACEHOLDERS: Record<FieldName, string> = {
  code: 'مثلاً: 105',
  name: 'مثلاً: شعبه شیراز',
  managerName: 'مثلاً: علی رضایی',
};

const FORM_ID = 'add-branch-form';

function validate(values: CreateBranchInput): FormErrors {
  const errors: FormErrors = {};
  if (!values.code.trim()) errors.code = 'کد شعبه الزامی است.';
  if (!values.name.trim()) errors.name = 'نام شعبه الزامی است.';
  if (!values.managerName.trim()) errors.managerName = 'نام مدیر شعبه الزامی است.';
  return errors;
}

export type AddBranchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persists the branch; rejects with a message shown inside the dialog. */
  onCreate: (input: CreateBranchInput) => Promise<void>;
};

/**
 * Create-branch dialog. Owns only its form state and validation; persistence is
 * delegated to the caller so the page can refresh the list afterwards.
 */
export function AddBranchDialog({ open, onOpenChange, onCreate }: AddBranchDialogProps) {
  const [values, setValues] = useState<CreateBranchInput>(INITIAL_VALUES);
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

  function handleChange(field: FieldName, event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setValues((previous) => ({ ...previous, [field]: nextValue }));

    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFormError(undefined);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onCreate({
        code: values.code.trim(),
        name: values.name.trim(),
        managerName: values.managerName.trim(),
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      setSubmitting(false);
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'ثبت شعبه با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="print:hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>شعبه جدید</DialogTitle>
          <DialogDescription>اطلاعات شعبه جدید را وارد کنید.</DialogDescription>
        </DialogHeader>

        <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="grid gap-4">
          {formError ? <InputErrorMassage role="alert">{formError}</InputErrorMassage> : null}

          {(Object.keys(FIELD_LABELS) as FieldName[]).map((field) => (
            <div key={field} className="grid gap-2">
              <Small className="font-medium">{FIELD_LABELS[field]}</Small>
              <Input
                id={`branch-${field}`}
                name={field}
                type="text"
                value={values[field]}
                onChange={(event) => handleChange(field, event)}
                placeholder={FIELD_PLACEHOLDERS[field]}
                aria-label={FIELD_LABELS[field]}
                aria-invalid={errors[field] ? true : undefined}
                aria-describedby={errors[field] ? `branch-${field}-error` : undefined}
                dir="rtl"
                disabled={submitting}
              />
              {errors[field] ? (
                <InputErrorMassage id={`branch-${field}-error`} role="alert">
                  {errors[field]}
                </InputErrorMassage>
              ) : null}
            </div>
          ))}

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
