"use client";
import { useState } from "react";
import * as z from "zod/mini";
import { fieldErrors } from "../lib/auth-schemas";

/** مدیریت ساده‌ی state فرم + اعتبارسنجی zod (بدون وابستگی اضافه). */
export function useAuthForm<T extends Record<string, string | boolean>>(
  initial: T,
  schema: z.ZodMiniType,
) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setValue<K extends keyof T>(name: K, value: T[K]) {
    setValues((v) => ({ ...v, [name]: value }));
    // مثل auth.html: با تایپ، خطای همان فیلد پاک می‌شود
    setErrors((e) => {
      if (!(name as string in e)) return e;
      const next = { ...e };
      delete next[name as string];
      return next;
    });
  }

  /** در صورت موفقیت داده‌ی پارس‌شده (trim شده) را برمی‌گرداند، وگرنه null. */
  function validate(): z.output<typeof schema> | null {
    const result = z.safeParse(schema, values);
    if (result.success) {
      setErrors({});
      return result.data;
    }
    setErrors(fieldErrors(result.error));
    return null;
  }

  return { values, errors, setValue, setErrors, validate };
}
