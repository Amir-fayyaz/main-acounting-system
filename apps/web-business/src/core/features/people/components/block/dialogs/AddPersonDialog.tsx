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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Small,
} from '@repo/web';

import type { CreatePersonInput, PersonKind } from '../../../assets/@types/person';
import { validatePersonForm } from '../../../lib/people.validation';

type FieldName = keyof CreatePersonInput;

type FormErrors = Partial<Record<FieldName, string>>;

const INITIAL_VALUES: CreatePersonInput = {
  name: '',
  kind: 'مشتری',
  phone: '',
};

const FORM_ID = 'add-person-form';

export type AddPersonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreatePersonInput) => Promise<void>;
};

export function AddPersonDialog({ open, onOpenChange, onCreate }: AddPersonDialogProps) {
  const [values, setValues] = useState<CreatePersonInput>(INITIAL_VALUES);
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

  function handleChange(field: 'name' | 'phone', event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setValues((previous) => ({ ...previous, [field]: nextValue }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validatePersonForm(values);
    setErrors(nextErrors);
    setFormError(undefined);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onCreate({
        name: values.name.trim(),
        kind: values.kind,
        phone: values.phone.trim(),
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      setSubmitting(false);
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'ثبت شخص با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="print:hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>شخص جدید</DialogTitle>
          <DialogDescription>اطلاعات شخص جدید را وارد کنید.</DialogDescription>
        </DialogHeader>

        <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="grid gap-4">
          {formError ? <InputErrorMassage role="alert">{formError}</InputErrorMassage> : null}

          <div className="grid gap-2">
            <Small className="font-medium">نام</Small>
            <Input
              id="person-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => handleChange('name', event)}
              aria-label="نام"
              aria-invalid={errors.name ? true : undefined}
              disabled={submitting}
            />
            {errors.name ? <InputErrorMassage role="alert">{errors.name}</InputErrorMassage> : null}
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">نوع</Small>
            <Select
              value={values.kind}
              onValueChange={(next) => setValues((previous) => ({ ...previous, kind: next as PersonKind }))}
              disabled={submitting}
            >
              <SelectTrigger aria-label="نوع شخص" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="مشتری">مشتری</SelectItem>
                <SelectItem value="تأمین‌کننده">تأمین‌کننده</SelectItem>
                <SelectItem value="هر دو">هر دو</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">تلفن</Small>
            <Input
              id="person-phone"
              name="phone"
              type="text"
              value={values.phone}
              onChange={(event) => handleChange('phone', event)}
              aria-label="تلفن"
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
