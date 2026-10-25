import type {
  ContactFieldErrors,
  ContactFieldId,
  ContactFieldValues,
} from '@/core/features/landing/assets/@types/contact';

export const contactFieldOrder: ContactFieldId[] = ['name', 'email', 'phone', 'message'];

const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\s()-]/g, '');

export function validateContactForm(values: ContactFieldValues): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  if (values.name.trim().length < 3) {
    errors.name = 'نام و نام خانوادگی خود را کامل وارد کنید.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'یک آدرس ایمیل معتبر وارد کنید.';
  }
  const phone = normalizeDigits(values.phone);
  if (phone && !/^(?:\+98|0098|0)?9\d{9}$/.test(phone)) {
    errors.phone = 'شماره موبایل واردشده معتبر نیست.';
  }
  if (values.message.trim().length < 10) {
    errors.message = 'پیامتان را با حداقل ۱۰ کاراکتر بنویسید.';
  }

  return errors;
}
