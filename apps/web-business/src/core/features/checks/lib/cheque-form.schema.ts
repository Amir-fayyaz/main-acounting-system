import { z } from 'zod';
import { formatJalaliDateFa, isPositiveMoney, mapZodErrorsToKnownFields, normalizeJalaliDate, normalizeMoneyInput, toAsciiDigits, toFaDigits } from '../../shared';
import {
  CHEQUE_DIRECTIONS,
  type ChequeFormErrors,
  type ChequeFormRules,
  type ChequeFormValues,
} from '../assets/@types/cheque.types';

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
            `شماره چک باید بین ${toFaDigits(rules.chequeNumber.minLength)} تا ${toFaDigits(
              rules.chequeNumber.maxLength,
            )} رقم باشد.`,
          ),
      ),
      sayadId: z.preprocess(
        normalizeDigitsInput,
        z
          .string()
          .regex(sayadPattern, `شناسه صیادی باید ${toFaDigits(rules.sayad.length)} رقم باشد.`),
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
  return mapZodErrorsToKnownFields(error, CHEQUE_FORM_FIELDS);
}
