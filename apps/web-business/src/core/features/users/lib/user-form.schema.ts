import { z } from 'zod';

import type { CreateUserInput } from '../assets/@types/user';
import { USER_ROLE_OPTIONS } from './users.config';

export type UserFormErrors = Partial<Record<keyof CreateUserInput, string>>;

const USER_FORM_FIELDS = new Set<keyof CreateUserInput>(['name', 'email', 'role', 'branch']);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmailInput(value: unknown): string {
  return normalizeTextInput(value).toLowerCase();
}

export const userFormSchema = z.object({
  name: z.preprocess(normalizeTextInput, z.string().min(1, 'نام را وارد کنید.')),
  email: z.preprocess(
    normalizeEmailInput,
    z
      .string()
      .min(1, 'ایمیل را وارد کنید.')
      .refine((value) => EMAIL_PATTERN.test(value), 'ایمیل معتبر نیست.'),
  ),
  role: z.preprocess(normalizeTextInput, z.string().min(1, 'نقش را انتخاب کنید.')),
  branch: z.preprocess(normalizeTextInput, z.string()).optional(),
});

export type UserFormValues = z.input<typeof userFormSchema>;
export type UserFormOutput = z.output<typeof userFormSchema>;

export function mapZodErrorsToUserFormErrors(error: z.ZodError): UserFormErrors {
  const errors: UserFormErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!USER_FORM_FIELDS.has(field as keyof CreateUserInput)) continue;
    const key = field as keyof CreateUserInput;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}

export function validateUserForm(values: CreateUserInput): UserFormErrors {
  const result = userFormSchema.safeParse(values);
  return result.success ? {} : mapZodErrorsToUserFormErrors(result.error);
}

export function toCreateUserInput(values: CreateUserInput): CreateUserInput {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role.trim(),
  };
}

export { USER_ROLE_OPTIONS };
