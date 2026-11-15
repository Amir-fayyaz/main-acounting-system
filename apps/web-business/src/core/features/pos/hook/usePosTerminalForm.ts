'use client';

import { useCallback, useRef, useState } from 'react';

import type {
  CreatePosTerminalRequest,
  PosTerminalFormErrors,
  PosTerminalFormValues,
} from '../assets/@types/pos-terminal.types';
import {
  createEmptyPosTerminalFormValues,
  mapPosFormValuesToCreateRequest,
} from '../lib/pos-form.mapper';
import { mapZodErrorsToPosTerminalFormErrors, posTerminalFormSchema } from '../lib/pos-form.schema';
import { posApi, type PosApi } from '../lib/pos-api';
import { isPosApiError, resolvePosErrorMessage } from '../lib/pos-api.errors';

export interface UsePosTerminalFormOptions {
  onValidSubmit: (payload: CreatePosTerminalRequest) => Promise<void>;
  /** برای تست یا تزریق نسخه‌ی دیگر API. */
  duplicateApi?: Pick<PosApi, 'findByTerminalNumber'>;
}

export interface UsePosTerminalFormResult {
  values: PosTerminalFormValues;
  errors: PosTerminalFormErrors;
  formError: string | null;
  isSubmitting: boolean;
  setField: <TField extends keyof PosTerminalFormValues>(
    field: TField,
    value: PosTerminalFormValues[TField],
  ) => void;
  submit: () => Promise<boolean>;
}

const SUBMIT_FALLBACK_ERROR = 'ثبت دستگاه انجام نشد. لطفاً دوباره تلاش کنید.';
const DUPLICATE_TERMINAL_MESSAGE = 'ترمینالی با این شماره قبلاً ثبت شده است.';

/**
 * وضعیت فرم ترمینال: اعتبارسنجی Zod، بررسی تکرار شماره ترمینال برای UX
 * و نگاشت خطاهای فیلد سرور. مرجع نهایی همیشه API است.
 */
export function usePosTerminalForm({
  onValidSubmit,
  duplicateApi,
}: UsePosTerminalFormOptions): UsePosTerminalFormResult {
  const [values, setValuesState] = useState<PosTerminalFormValues>(
    createEmptyPosTerminalFormValues,
  );
  const [errors, setErrors] = useState<PosTerminalFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const duplicateSource = duplicateApi ?? posApi;

  const setField = useCallback(
    <TField extends keyof PosTerminalFormValues>(
      field: TField,
      value: PosTerminalFormValues[TField],
    ) => {
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

    const parsed = posTerminalFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(mapZodErrorsToPosTerminalFormErrors(parsed.error));
      return false;
    }

    const payload = mapPosFormValuesToCreateRequest(parsed.data);
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const duplicate = await duplicateSource.findByTerminalNumber(payload.terminalNumber);
      if (duplicate) {
        setErrors({ terminalNumber: DUPLICATE_TERMINAL_MESSAGE });
        return false;
      }

      await onValidSubmit(payload);

      return true;
    } catch (error: unknown) {
      if (isPosApiError(error)) {
        if (error.fieldErrors) setErrors(error.fieldErrors);
        setFormError(error.fieldErrors ? null : error.message);

        return false;
      }

      setFormError(resolvePosErrorMessage(error, SUBMIT_FALLBACK_ERROR));

      return false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [duplicateSource, onValidSubmit, values]);

  return {
    values,
    errors,
    formError,
    isSubmitting,
    setField,
    submit,
  };
}
