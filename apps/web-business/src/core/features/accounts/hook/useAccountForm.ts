'use client';

import { useCallback, useRef, useState } from 'react';

import type {
  AccountFormErrors,
  AccountFormValues,
  CreateAccountRequest,
} from '../assets/@types/account.types';
import {
  createEmptyAccountFormValues,
  mapAccountFormValuesToCreateRequest,
} from '../lib/account-form.mapper';
import { accountFormSchema, mapZodErrorsToAccountFormErrors } from '../lib/account-form.schema';
import { isAccountApiError, resolveAccountErrorMessage } from '../lib/accounts-api.errors';

export interface UseAccountFormOptions {
  onValidSubmit: (payload: CreateAccountRequest) => Promise<void>;
}

export interface UseAccountFormResult {
  values: AccountFormValues;
  errors: AccountFormErrors;
  formError: string | null;
  isSubmitting: boolean;
  setField: <TField extends keyof AccountFormValues>(
    field: TField,
    value: AccountFormValues[TField],
  ) => void;
  submit: () => Promise<boolean>;
}

const SUBMIT_FALLBACK_ERROR = 'ایجاد حساب انجام نشد. لطفاً دوباره تلاش کنید.';

/** وضعیت فرم ایجاد حساب: اعتبارسنجی Zod و نگاشت خطاهای فیلد API. */
export function useAccountForm({ onValidSubmit }: UseAccountFormOptions): UseAccountFormResult {
  const [values, setValuesState] = useState<AccountFormValues>(createEmptyAccountFormValues);
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const setField = useCallback(
    <TField extends keyof AccountFormValues>(field: TField, value: AccountFormValues[TField]) => {
      setValuesState((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        if (!current[field]) return current;

        const next = { ...current };
        delete next[field];

        return next;
      });
      setFormError(null);
    },
    [],
  );

  const submit = useCallback(async (): Promise<boolean> => {
    if (submittingRef.current) return false;

    setFormError(null);

    const parsed = accountFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(mapZodErrorsToAccountFormErrors(parsed.error));
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      await onValidSubmit(mapAccountFormValuesToCreateRequest(parsed.data));

      return true;
    } catch (error: unknown) {
      if (isAccountApiError(error)) {
        if (error.fieldErrors) setErrors(error.fieldErrors);
        setFormError(error.fieldErrors ? null : error.message);

        return false;
      }

      setFormError(resolveAccountErrorMessage(error, SUBMIT_FALLBACK_ERROR));

      return false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [onValidSubmit, values]);

  return {
    values,
    errors,
    formError,
    isSubmitting,
    setField,
    submit,
  };
}
