import { z } from 'zod';

import type { CreateSaleInput } from '../assets/@types/sale';
import { parseNumberInput } from '../utils/number';

export type SaleFormErrors = Partial<Record<keyof CreateSaleInput, string>>;

const SALE_FORM_FIELDS = new Set<keyof CreateSaleInput>(['cust', 'seller', 'gross']);

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGrossInput(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return Number.NaN;
  return parseNumberInput(value);
}

/** قواعد اعتبارسنجی فرم فاکتور فروش؛ مستقل از کامپوننت و قابل استفاده‌ی مجدد. */
export const saleFormSchema = z.object({
  cust: z.preprocess(normalizeTextInput, z.string().min(1, 'انتخاب مشتری الزامی است.')),
  seller: z.preprocess(normalizeTextInput, z.string().min(1, 'انتخاب فروشنده الزامی است.')),
  gross: z.preprocess(
    normalizeGrossInput,
    z
      .number()
      .refine((value) => Number.isFinite(value), 'مبلغ ناخالص باید بیشتر از صفر باشد.')
      .refine((value) => value > 0, 'مبلغ ناخالص باید بیشتر از صفر باشد.'),
  ),
});

export type SaleFormValues = z.input<typeof saleFormSchema>;
export type SaleFormOutput = z.output<typeof saleFormSchema>;

export function mapZodErrorsToSaleFormErrors(error: z.ZodError): SaleFormErrors {
  const errors: SaleFormErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!SALE_FORM_FIELDS.has(field as keyof CreateSaleInput)) continue;
    const key = field as keyof CreateSaleInput;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}

/** Validates the sale form and returns per-field error messages. */
export function validateSaleForm(values: CreateSaleInput): SaleFormErrors {
  const result = saleFormSchema.safeParse(values);
  return result.success ? {} : mapZodErrorsToSaleFormErrors(result.error);
}
