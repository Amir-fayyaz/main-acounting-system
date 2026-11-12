import type { CreatePersonInput } from '../assets/@types/person';

export type PersonFormErrors = Partial<Record<keyof CreatePersonInput, string>>;

export function validatePersonForm(values: CreatePersonInput): PersonFormErrors {
  const errors: PersonFormErrors = {};
  if (!values.name.trim()) errors.name = 'نام شخص الزامی است.';
  return errors;
}
