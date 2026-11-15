import { z } from 'zod';

import type { CreatePersonInput } from '../assets/@types/person';

export type PersonFormErrors = Partial<Record<keyof CreatePersonInput, string>>;

const PERSON_FORM_FIELDS = new Set<keyof CreatePersonInput>(['name', 'kind', 'phone']);

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export const personFormSchema = z.object({
  name: z.preprocess(normalizeTextInput, z.string().min(1, 'نام شخص الزامی است.')),
  kind: z.enum(['مشتری', 'تأمین‌کننده', 'هر دو']),
  phone: z.preprocess(normalizeTextInput, z.string()),
});

export type PersonFormValues = z.input<typeof personFormSchema>;
export type PersonFormOutput = z.output<typeof personFormSchema>;

export function mapZodErrorsToPersonFormErrors(error: z.ZodError): PersonFormErrors {
  const errors: PersonFormErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!PERSON_FORM_FIELDS.has(field as keyof CreatePersonInput)) continue;
    const key = field as keyof CreatePersonInput;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}

export function validatePersonForm(values: CreatePersonInput): PersonFormErrors {
  const result = personFormSchema.safeParse(values);
  return result.success ? {} : mapZodErrorsToPersonFormErrors(result.error);
}
