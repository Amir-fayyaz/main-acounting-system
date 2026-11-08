'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type {
  Cheque,
  ChequeFormErrors,
  ChequeFormRules,
  ChequeFormValues,
  CreateChequeRequest,
} from '../assets/@types/cheque.types';
import { createChequeFormSchema, mapZodErrorsToChequeFormErrors } from '../lib/cheque-form.schema';
import {
  createChequeFormValues,
  mapChequeFormValuesToCreateRequest,
} from '../lib/cheque-form.mapper';
import { checksApi, type ChecksApi } from '../lib/checks-api';
import { isChequeApiError, resolveChequeErrorMessage } from '../lib/checks-api.errors';

export interface UseChequeFormOptions {
  /** در حالت ویرایش، چک فعلی برای مقدار اولیه و `excludeId` تکرار استفاده می‌شود. */
  cheque?: Cheque | null;
  rules: ChequeFormRules;
  onValidSubmit: (payload: CreateChequeRequest) => Promise<void>;
  /** برای تست یا تزریق نسخه‌ی دیگر API. */
  conflictApi?: Pick<ChecksApi, 'findConflict'>;
}

export interface UseChequeFormResult {
  values: ChequeFormValues;
  errors: ChequeFormErrors;
  formError: string | null;
  isSubmitting: boolean;
  setField: <TField extends keyof ChequeFormValues>(
    field: TField,
    value: ChequeFormValues[TField],
  ) => void;
  setValues: (values: ChequeFormValues) => void;
  /** `true` فقط وقتی ذخیره‌ی سمت والد بدون خطا انجام شود. */
  submit: () => Promise<boolean>;
}

const SUBMIT_FALLBACK_ERROR = 'ذخیره‌ی چک انجام نشد. لطفاً دوباره تلاش کنید.';
const DUPLICATE_NUMBER_MESSAGE = 'چکی با این شماره برای همین بانک قبلاً ثبت شده است.';
const DUPLICATE_SAYAD_MESSAGE = 'این شناسه صیادی قبلاً ثبت شده است.';

/**
 * وضعیت فرم چک: اعتبارسنجی Zod بر پایه‌ی قواعد API، بررسی تکرار در لایه‌ی فرم
 * برای UX و نگاشت خطاهای فیلد سرور. مرجع نهایی همیشه API است.
 */
export function useChequeForm({
  cheque,
  rules,
  onValidSubmit,
  conflictApi,
}: UseChequeFormOptions): UseChequeFormResult {
  const [values, setValuesState] = useState<ChequeFormValues>(() => createChequeFormValues(cheque));
  const [errors, setErrors] = useState<ChequeFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const schema = useMemo(() => createChequeFormSchema(rules), [rules]);
  const conflictSource = conflictApi ?? checksApi;
  const chequeId = cheque?.id;

  const setField = useCallback(
    <TField extends keyof ChequeFormValues>(field: TField, value: ChequeFormValues[TField]) => {
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

  const setValues = useCallback((nextValues: ChequeFormValues) => {
    setValuesState(nextValues);
    setErrors({});
    setFormError(null);
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    if (submittingRef.current) return false;

    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setErrors(mapZodErrorsToChequeFormErrors(parsed.error));
      return false;
    }

    const payload = mapChequeFormValuesToCreateRequest(parsed.data);
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const conflict = await conflictSource.findConflict({
        number: payload.number,
        bank: payload.bank,
        sayadId: payload.sayadId,
        ...(chequeId ? { excludeId: chequeId } : {}),
      });

      const conflictErrors: ChequeFormErrors = {};
      if (conflict.number) conflictErrors.number = DUPLICATE_NUMBER_MESSAGE;
      if (conflict.sayadId) conflictErrors.sayadId = DUPLICATE_SAYAD_MESSAGE;

      if (Object.keys(conflictErrors).length > 0) {
        setErrors(conflictErrors);
        return false;
      }

      await onValidSubmit(payload);

      return true;
    } catch (error: unknown) {
      if (isChequeApiError(error)) {
        if (error.fieldErrors) setErrors(error.fieldErrors);
        setFormError(error.fieldErrors ? null : error.message);

        return false;
      }

      setFormError(resolveChequeErrorMessage(error, SUBMIT_FALLBACK_ERROR));

      return false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [chequeId, conflictSource, onValidSubmit, schema, values]);

  return {
    values,
    errors,
    formError,
    isSubmitting,
    setField,
    setValues,
    submit,
  };
}
