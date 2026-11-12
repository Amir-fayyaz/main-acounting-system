import type { CompanyErrors, CompanyInfo } from '../assets/@types/settings';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const NATIONAL_ID_PATTERN = /^\d{11}$/;

const CURRENCIES = ['IRR', 'TOMAN'] as const;

export function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(digit);
      if (persianIndex >= 0) return String(persianIndex);

      return String(ARABIC_DIGITS.indexOf(digit));
    })
    .replace(/[\s-]/g, '');
}

export function hasErrors(errors: CompanyErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function validateCompanyInfo(company: CompanyInfo): CompanyErrors {
  const errors: CompanyErrors = {};

  const companyName = company.companyName.trim();
  if (!companyName) {
    errors.companyName = 'نام شرکت الزامی است.';
  } else if (companyName.length < 2) {
    errors.companyName = 'نام شرکت باید حداقل ۲ نویسه باشد.';
  }

  const nationalId = normalizeDigits(company.nationalId);
  if (!nationalId) {
    errors.nationalId = 'شناسه ملی الزامی است.';
  } else if (!NATIONAL_ID_PATTERN.test(nationalId)) {
    errors.nationalId = 'شناسه ملی باید ۱۱ رقم باشد.';
  }

  if (!company.fiscalYearStart.trim()) {
    errors.fiscalYearStart = 'شروع سال مالی مشخص نیست.';
  }

  if (!CURRENCIES.includes(company.currency)) {
    errors.currency = 'واحد پول انتخاب‌شده معتبر نیست.';
  }

  return errors;
}
