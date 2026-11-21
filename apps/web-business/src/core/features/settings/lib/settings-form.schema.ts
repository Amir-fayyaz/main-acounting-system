import { z } from 'zod';

import type { CompanyErrors, CompanyInfo } from '../assets/@types/settings';
import { normalizeDigits } from '../utils/digits';

const NATIONAL_ID_PATTERN = /^\d{11}$/;

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNationalIdInput(value: unknown): string {
  return typeof value === 'string' ? normalizeDigits(value) : '';
}

export const companyInfoSchema = z.object({
  companyName: z.preprocess(
    normalizeTextInput,
    z
      .string()
      .min(1, 'نام شرکت الزامی است.')
      .min(2, 'نام شرکت باید حداقل ۲ نویسه باشد.'),
  ),
  nationalId: z.preprocess(
    normalizeNationalIdInput,
    z
      .string()
      .min(1, 'شناسه ملی الزامی است.')
      .regex(NATIONAL_ID_PATTERN, 'شناسه ملی باید ۱۱ رقم باشد.'),
  ),
  fiscalYearStart: z.preprocess(
    normalizeTextInput,
    z.string().min(1, 'شروع سال مالی مشخص نیست.'),
  ),
  currency: z
    .string()
    .refine((value) => value === 'IRR' || value === 'TOMAN', 'واحد پول انتخاب‌شده معتبر نیست.'),
});

export type SettingsFormValues = z.input<typeof companyInfoSchema>;
export type SettingsFormOutput = z.output<typeof companyInfoSchema>;

export function mapZodErrorsToCompanyErrors(error: z.ZodError): CompanyErrors {
  const errors: CompanyErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    const key = field as keyof CompanyInfo;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}
