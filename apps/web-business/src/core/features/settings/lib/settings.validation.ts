import type { CompanyErrors, CompanyInfo } from '../assets/@types/settings';
import { normalizeDigits } from '../utils/digits';
import { companyInfoSchema, mapZodErrorsToCompanyErrors } from './settings-form.schema';

export { normalizeDigits };

export function hasErrors(errors: CompanyErrors): boolean {
  return Object.values(errors).some(Boolean);
}

/** Validates the company card using the shared schema. */
export function validateCompanyInfo(company: CompanyInfo): CompanyErrors {
  const result = companyInfoSchema.safeParse(company);
  return result.success ? {} : mapZodErrorsToCompanyErrors(result.error);
}
