import { z } from 'zod';

import type { CreatePurchaseInput } from '../assets/@types/purchase';

export type PurchaseFormErrors = Partial<Record<keyof CreatePurchaseInput, string>>;

const PURCHASE_FORM_FIELDS = new Set<keyof CreatePurchaseInput>([
  'supplier',
  'total',
  'discountPercent',
  'due',
  'description',
]);

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumberInput(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || !value.trim()) return Number.NaN;
  return Number(value.replace(/[٬,\s]/g, ''));
}

export const purchaseFormSchema = z.object({
  supplier: z.preprocess(normalizeTextInput, z.string().min(1, 'نام تأمین‌کننده الزامی است.')),
  total: z.preprocess(
    normalizeNumberInput,
    z
      .number()
      .refine((value) => Number.isFinite(value) && value > 0, 'مبلغ فاکتور را وارد کنید.'),
  ),
  discountPercent: z.preprocess(
    normalizeNumberInput,
    z
      .number()
      .refine(
        (value) => Number.isFinite(value) && value >= 0 && value <= 100,
        'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد.',
      ),
  ),
  due: z.preprocess(normalizeTextInput, z.string()),
  description: z.preprocess(normalizeTextInput, z.string()),
});

export type PurchaseFormValues = z.input<typeof purchaseFormSchema>;
export type PurchaseFormOutput = z.output<typeof purchaseFormSchema>;

export function mapZodErrorsToPurchaseFormErrors(error: z.ZodError): PurchaseFormErrors {
  const errors: PurchaseFormErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!PURCHASE_FORM_FIELDS.has(field as keyof CreatePurchaseInput)) continue;
    const key = field as keyof CreatePurchaseInput;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}

export function validatePurchaseForm(values: CreatePurchaseInput): PurchaseFormErrors {
  const result = purchaseFormSchema.safeParse(values);
  return result.success ? {} : mapZodErrorsToPurchaseFormErrors(result.error);
}
