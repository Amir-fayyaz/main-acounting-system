import { z } from 'zod';
import { mapZodErrorsToKnownFields, normalizeIban, normalizeMoneyInput } from '../../shared';
import {
  ACCOUNT_TYPES,
  type AccountFormErrors,
  type AccountFormValues,
} from '../assets/@types/account.types';
import { ACCOUNT_IBAN_PATTERN } from './accounts.config';

const ACCOUNT_FORM_FIELDS = new Set<keyof AccountFormValues>([
  'title',
  'type',
  'bank',
  'iban',
  'openingBalance',
]);

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIbanInput(value: unknown): string {
  return typeof value === 'string' ? normalizeIban(value) : '';
}

function normalizeOpeningBalanceInput(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '0.00';

  return normalizeMoneyInput(value) ?? '';
}

export const accountFormSchema = z
  .object({
    title: z.preprocess(normalizeTextInput, z.string().min(1, 'عنوان حساب را وارد کنید.')),
    type: z.enum(ACCOUNT_TYPES),
    bank: z.preprocess(normalizeTextInput, z.string()),
    iban: z.preprocess(normalizeIbanInput, z.string()),
    openingBalance: z.preprocess(
      normalizeOpeningBalanceInput,
      z
        .string()
        .min(1, 'موجودی اولیه را به شکل مبلغ معتبر وارد کنید؛ مثال: ۱۲۵٬۰۰۰٬۰۰۰')
        .regex(/^\d+\.\d{2}$/, 'موجودی اولیه را به شکل مبلغ معتبر وارد کنید؛ مثال: ۱۲۵٬۰۰۰٬۰۰۰'),
    ),
  })
  .superRefine((values, context) => {
    if (values.type !== 'bank') return;

    if (!values.bank) {
      context.addIssue({
        code: 'custom',
        path: ['bank'],
        message: 'نام بانک را وارد کنید.',
      });
    }

    if (!values.iban) {
      context.addIssue({
        code: 'custom',
        path: ['iban'],
        message: 'شماره شبا را وارد کنید.',
      });
    } else if (!ACCOUNT_IBAN_PATTERN.test(values.iban)) {
      context.addIssue({
        code: 'custom',
        path: ['iban'],
        message: 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد.',
      });
    }
  });

export type AccountFormSchema = typeof accountFormSchema;

export type AccountFormOutput = z.output<AccountFormSchema>;

export function mapZodErrorsToAccountFormErrors(error: z.ZodError): AccountFormErrors {
  return mapZodErrorsToKnownFields(error, ACCOUNT_FORM_FIELDS);
}
