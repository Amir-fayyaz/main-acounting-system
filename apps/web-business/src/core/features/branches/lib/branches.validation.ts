import type { CreateBranchInput } from '../assets/@types/branch';

export type BranchFormErrors = Partial<Record<keyof CreateBranchInput, string>>;

export function validateBranchForm(values: CreateBranchInput): BranchFormErrors {
  const errors: BranchFormErrors = {};
  if (!values.code.trim()) errors.code = 'کد شعبه الزامی است.';
  if (!values.name.trim()) errors.name = 'نام شعبه الزامی است.';
  if (!values.managerName.trim()) errors.managerName = 'نام مدیر شعبه الزامی است.';
  return errors;
}
