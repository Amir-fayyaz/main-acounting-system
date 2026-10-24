'use client';

import { useState } from 'react';
import * as z from 'zod/mini';
import { fieldErrors } from '../lib/auth-schemas';

type AuthFormValues = Record<string, string | boolean>;

/**
 * مدیریت state فرم + اعتبارسنجی zod.
 * T = شکل values فرم (مثلاً SignUpFormValues)
 */
export function useAuthForm<T extends AuthFormValues>(initial: T, schema: z.ZodMiniType) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  function setValue<K extends keyof T>(name: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  /** در صورت موفقیت دادهٔ پارس‌شده را برمی‌گرداند، وگرنه null. */
  function validate(): T | null {
    const result = z.safeParse(schema, values);
    if (result.success) {
      setErrors({});
      return result.data as T;
    }
    setErrors(fieldErrors(result.error) as Partial<Record<keyof T, string>>);
    return null;
  }

  return { values, errors, setValue, setErrors, validate };
}
