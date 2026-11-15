import { z } from 'zod';

import type {
  PosTerminalFormErrors,
  PosTerminalFormValues,
} from '../assets/@types/pos-terminal.types';
import { isFeeInRange, normalizeFeeInput } from '../utils/fee';
import { toAsciiDigits } from '../utils/format';

const POS_FORM_FIELDS = new Set<keyof PosTerminalFormValues>([
  'title',
  'terminalNumber',
  'merchantNumber',
  'bank',
  'feePercent',
]);

const INVALID_FEE = '__invalid_fee__';
const DIGITS_ONLY = /^\d+$/;

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDigitsInput(value: unknown): string {
  return typeof value === 'string' ? toAsciiDigits(value).trim() : '';
}

function normalizeFeeField(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';

  return normalizeFeeInput(value) ?? INVALID_FEE;
}

/**
 * Schema فرم ترمینال: عنوان و شماره ترمینال الزامی‌اند؛
 * شماره پذیرنده و کارمزد اختیاری‌اند اما در صورت ورود اعتبارسنجی می‌شوند.
 */
export const posTerminalFormSchema = z.object({
  title: z.preprocess(normalizeTextInput, z.string().min(1, 'عنوان دستگاه را وارد کنید.')),
  terminalNumber: z.preprocess(
    normalizeDigitsInput,
    z
      .string()
      .min(1, 'شماره ترمینال را وارد کنید.')
      .regex(DIGITS_ONLY, 'شماره ترمینال باید فقط رقم باشد.'),
  ),
  merchantNumber: z.preprocess(
    normalizeDigitsInput,
    z
      .string()
      .refine(
        (value) => value === '' || DIGITS_ONLY.test(value),
        'شماره پذیرنده باید فقط رقم باشد.',
      ),
  ),
  bank: z.preprocess(normalizeTextInput, z.string()),
  feePercent: z.preprocess(
    normalizeFeeField,
    z
      .string()
      .refine(
        (value) => value === '' || isFeeInRange(value),
        'کارمزد باید عددی بین ۰ تا ۱۰۰ باشد؛ نمونه: ۰٫۷',
      ),
  ),
});

export type PosTerminalFormSchema = typeof posTerminalFormSchema;

export type PosTerminalFormOutput = z.output<PosTerminalFormSchema>;

export function mapZodErrorsToPosTerminalFormErrors(error: z.ZodError): PosTerminalFormErrors {
  const errors: PosTerminalFormErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!POS_FORM_FIELDS.has(field as keyof PosTerminalFormValues)) continue;
    const key = field as keyof PosTerminalFormValues;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}
