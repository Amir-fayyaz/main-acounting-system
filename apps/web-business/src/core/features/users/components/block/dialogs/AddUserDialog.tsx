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

import type { CreateUserInput } from '../../../assets/@types/user';
import { USER_ROLE_OPTIONS } from '../../ui/UsersToolbar';

type FieldName = 'name' | 'email' | 'role';

type FormErrors = Partial<Record<FieldName, string>>;

const INITIAL_VALUES: CreateUserInput = {
  name: '',
  email: '',
  role: 'حسابدار',
};

const FORM_ID = 'add-user-form';

export type AddUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persists the user; rejects with a message shown inside the dialog. */
  onCreate: (input: CreateUserInput) => Promise<void>;
};

function validate(values: CreateUserInput): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = 'نام را وارد کنید.';
  const email = values.email.trim();
  if (!email) {
    errors.email = 'ایمیل را وارد کنید.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'ایمیل معتبر نیست.';
  }
  if (!values.role.trim()) errors.role = 'نقش را انتخاب کنید.';
  return errors;
}

export function AddUserDialog({ open, onOpenChange, onCreate }: AddUserDialogProps) {
  const [values, setValues] = useState<CreateUserInput>(INITIAL_VALUES);
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

  function handleChange(field: 'name' | 'email', event: ChangeEvent<HTMLInputElement>) {
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
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role.trim(),
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      setSubmitting(false);
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'ثبت کاربر با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="print:hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>کاربر جدید</DialogTitle>
          <DialogDescription>اطلاعات کاربر جدید را وارد کنید.</DialogDescription>
        </DialogHeader>

        <form id={FORM_ID} noValidate onSubmit={handleSubmit} className="grid gap-4">
          {formError ? <InputErrorMassage role="alert">{formError}</InputErrorMassage> : null}

          <div className="grid gap-2">
            <Small className="font-medium">نام نمایشی</Small>
            <Input
              id="user-name"
              name="name"
              type="text"
              value={values.name}
              onChange={(event) => handleChange('name', event)}
              aria-label="نام نمایشی"
              aria-invalid={errors.name ? true : undefined}
              disabled={submitting}
            />
            {errors.name ? <InputErrorMassage role="alert">{errors.name}</InputErrorMassage> : null}
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">ایمیل</Small>
            <Input
              id="user-email"
              name="email"
              type="email"
              value={values.email}
              onChange={(event) => handleChange('email', event)}
              aria-label="ایمیل"
              aria-invalid={errors.email ? true : undefined}
              disabled={submitting}
            />
            {errors.email ? <InputErrorMassage role="alert">{errors.email}</InputErrorMassage> : null}
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">نقش</Small>
            <Select
              value={values.role}
              onValueChange={(next) => {
                setValues((previous) => ({ ...previous, role: next }));
                if (errors.role) setErrors((previous) => ({ ...previous, role: undefined }));
              }}
              disabled={submitting}
            >
              <SelectTrigger aria-label="نقش" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role ? <InputErrorMassage role="alert">{errors.role}</InputErrorMassage> : null}
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
