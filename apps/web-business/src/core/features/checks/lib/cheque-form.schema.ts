import { z } from 'zod';

import {
  CHEQUE_DIRECTIONS,
  type ChequeFormErrors,
  type ChequeFormRules,
  type ChequeFormValues,
} from '../assets/@types/cheque.types';
import { formatJalaliDateFa, toAsciiDigits, toPersianDigits } from '../utils/format';
import { normalizeJalaliDate } from '../utils/jalali';
import { isPositiveMoney, normalizeMoneyInput } from '../utils/money';

const CHEQUE_FORM_FIELDS = new Set<keyof ChequeFormValues>([
  'number',
  'sayadId',
  'direction',
  'counterparty',
  'bank',
  'amount',
  'registeredDate',
  'dueDate',
]);

function normalizeDigitsInput(value: unknown): string {
  return typeof value === 'string' ? toAsciiDigits(value).trim() : '';
}

function normalizeDateInput(value: unknown): string {
  return typeof value === 'string' ? (normalizeJalaliDate(value) ?? '') : '';
}

function normalizeAmountInput(value: unknown): string {
  return typeof value === 'string' ? (normalizeMoneyInput(value) ?? '') : '';
}

/**
 * Schema فرم بر پایه‌ی قواعدی ساخته می‌شود که API اعلام کرده است.
 * این لایه فقط برای UX و اعتبارسنجی فرم است؛ مرجع نهایی، API است.
 */
export function createChequeFormSchema(rules: ChequeFormRules) {
  const chequeNumberPattern = new RegExp(rules.chequeNumber.pattern);
  const sayadPattern = new RegExp(rules.sayad.pattern);

  return z
    .object({
      number: z.preprocess(
        normalizeDigitsInput,
        z
          .string()
          .regex(
            chequeNumberPattern,
            `شماره چک باید بین ${toPersianDigits(rules.chequeNumber.minLength)} تا ${toPersianDigits(
              rules.chequeNumber.maxLength,
            )} رقم باشد.`,
          ),
      ),
      sayadId: z.preprocess(
        normalizeDigitsInput,
        z
          .string()
          .regex(sayadPattern, `شناسه صیادی باید ${toPersianDigits(rules.sayad.length)} رقم باشد.`),
      ),
      direction: z.enum(CHEQUE_DIRECTIONS),
      counterparty: z.string().trim().min(1, 'طرف حساب را وارد کنید.'),
      bank: z.string().trim().min(1, 'بانک را وارد کنید.'),
      amount: z.preprocess(
        normalizeAmountInput,
        z
          .string()
          .min(1, 'مبلغ چک را وارد کنید.')
          .refine(isPositiveMoney, 'مبلغ چک باید بیشتر از صفر باشد.'),
      ),
      registeredDate: z.preprocess(
        normalizeDateInput,
        z.string().min(1, 'تاریخ ثبت را به شکل شمسی و معتبر وارد کنید؛ مثال: ۱۴۰۵/۰۷/۲۷'),
      ),
      dueDate: z.preprocess(
        normalizeDateInput,
        z.string().min(1, 'تاریخ سررسید را به شکل شمسی و معتبر وارد کنید؛ مثال: ۱۴۰۵/۰۷/۲۷'),
      ),
    })
    .superRefine((values, context) => {
      if (values.dueDate && values.registeredDate && values.dueDate < values.registeredDate) {
        context.addIssue({
          code: 'custom',
          path: ['dueDate'],
          message: `تاریخ سررسید (${formatJalaliDateFa(
            values.dueDate,
          )}) قبل از تاریخ ثبت (${formatJalaliDateFa(
            values.registeredDate,
          )}) است؛ ثبت چک با سررسید قبل از تاریخ ثبت مجاز نیست.`,
        });
      }
    });
}

export type ChequeFormSchema = ReturnType<typeof createChequeFormSchema>;

export type ChequeFormOutput = z.output<ChequeFormSchema>;

export function mapZodErrorsToChequeFormErrors(error: z.ZodError): ChequeFormErrors {
  const errors: ChequeFormErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!CHEQUE_FORM_FIELDS.has(field as keyof ChequeFormValues)) continue;
    const key = field as keyof ChequeFormValues;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}
