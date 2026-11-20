import { z } from 'zod';

import type { CreateBranchInput } from '../assets/@types/branch';

export type BranchFormErrors = Partial<Record<keyof CreateBranchInput, string>>;

const BRANCH_FORM_FIELDS = new Set<keyof CreateBranchInput>(['code', 'name', 'managerName']);

function normalizeTextInput(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export const branchFormSchema = z.object({
  code: z.preprocess(normalizeTextInput, z.string().min(1, 'کد شعبه الزامی است.')),
  name: z.preprocess(normalizeTextInput, z.string().min(1, 'نام شعبه الزامی است.')),
  managerName: z.preprocess(normalizeTextInput, z.string().min(1, 'نام مدیر شعبه الزامی است.')),
});

export type BranchFormValues = z.input<typeof branchFormSchema>;
export type BranchFormOutput = z.output<typeof branchFormSchema>;

export function mapZodErrorsToBranchFormErrors(error: z.ZodError): BranchFormErrors {
  const errors: BranchFormErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string') continue;
    if (!BRANCH_FORM_FIELDS.has(field as keyof CreateBranchInput)) continue;
    const key = field as keyof CreateBranchInput;
    if (!errors[key]) errors[key] = issue.message;
  }

  return errors;
}

export function validateBranchForm(values: CreateBranchInput): BranchFormErrors {
  const result = branchFormSchema.safeParse(values);
  return result.success ? {} : mapZodErrorsToBranchFormErrors(result.error);
}
