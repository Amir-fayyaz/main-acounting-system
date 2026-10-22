'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/shadcn/button/button';
import { Input } from '@/shadcn/input/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shadcn/select/select';
import { Textarea } from '@/shadcn/Textarea/textarea';
import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
import ContactSuccess from './contactSuccess/ContactSuccess';
import { contactTopics } from '../../contactData';
import type { ContactTopic } from '../../contactData';

export interface ContactFormProps {
  topics?: ContactTopic[];
}

type FieldId = 'name' | 'email' | 'phone' | 'message';
type FieldValues = Record<FieldId, string>;
type FieldErrors = Partial<Record<FieldId, string>>;

const emptyValues: FieldValues = { name: '', email: '', phone: '', message: '' };

const fieldOrder: FieldId[] = ['name', 'email', 'phone', 'message'];

/** تبدیل ارقام فارسی/عربی به لاتین و حذف فاصله‌ها و جداکننده‌ها برای اعتبارسنجی شماره */
const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[\s()-]/g, '');

const validate = (values: FieldValues): FieldErrors => {
  const errors: FieldErrors = {};

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
};

const fieldClass =
  'min-h-[45px] rounded-[6px] border-contact-field-border! bg-contact-field-bg! px-3 py-[10px] text-[12px] placeholder:text-contact-placeholder! aria-invalid:border-contact-error-border!';

const textareaClass =
  'mt-0! min-h-[132px]! rounded-[6px] border-contact-field-border! bg-contact-field-bg! px-3 py-[10px]! text-[12px] leading-[2] placeholder:text-contact-placeholder! aria-invalid:border-contact-error-border! [field-sizing:fixed]';

const selectClass =
  'w-full! min-h-[45px] rounded-[6px] border-contact-field-border! bg-contact-field-bg! px-3 py-[10px] text-[12px]';

function FieldError({ id, message }: { id: FieldId; message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-[5px] text-[10px] leading-[1.9] text-contact-error" id={`contact-${id}-error`}>
      {message}
    </p>
  );
}

function ContactForm({ topics = contactTopics }: ContactFormProps) {
  const searchParams = useSearchParams();
  const [values, setValues] = useState<FieldValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});

  // انتخاب موضوع از پارامتر URL (?topic=sales) — مثل فایل اصلی
  const [topic, setTopic] = useState<string>(() => {
    const selected = searchParams.get('topic');
    return selected && topics.some((item) => item.value === selected)
      ? selected
      : (topics[0]?.value ?? '');
  });

  const [successName, setSuccessName] = useState<string | null>(null);

  // بعد از نمایش حالت موفقیت، فوکوس روی عنوان پیام (مثل فایل اصلی)
  useEffect(() => {
    if (successName !== null) {
      document.getElementById('contact-success-title')?.focus();
    }
  }, [successName]);

  const setValue = (id: FieldId) => (value: string) => {
    setValues((previous) => ({ ...previous, [id]: value }));
    setErrors((previous) => ({ ...previous, [id]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    const firstInvalid = fieldOrder.find((id) => nextErrors[id]);
    if (firstInvalid) {
      document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }

    setSuccessName(values.name.trim());
  };

  const handleReset = () => {
    setValues(emptyValues);
    setErrors({});
    setSuccessName(null);
    document.getElementById('contact-name')?.focus();
  };

  return (
    <section
      aria-label="فرم تماس نمایشی"
      className="rounded-[14px] border border-contact-card-border bg-contact-card-bg p-[25px_22px] max-taraz-3xl:p-[27px] max-taraz-xl:p-6 sm:p-[30px_32px]"
    >
      <h2 className="mb-[6px] text-[22px] leading-[1.8] tracking-[-0.4px] sm:text-[21px]">
        همین‌جا برایمان بنویسید.
      </h2>

      <p className="mb-[23px] text-[11px] leading-[2] text-muted-foreground max-taraz-sm:mb-[21px]">
        فیلدهای نام، ایمیل و پیام برای تکمیل فرم لازم‌اند.
      </p>

      {successName !== null ? (
        <ContactSuccess name={successName} onReset={handleReset} />
      ) : (
        <form noValidate onSubmit={handleSubmit}>
          <div className="grid gap-x-[18px] max-taraz-xl:grid-cols-1 sm:grid-cols-2">
            <div className="mb-[17px]">
              <label className="mb-[7px] block text-[11px] font-semibold" htmlFor="contact-name">
                نام و نام خانوادگی
              </label>
              <Input
                aria-describedby="contact-name-error"
                aria-invalid={errors.name ? true : undefined}
                autoComplete="name"
                className={fieldClass}
                id="contact-name"
                maxLength={80}
                name="name"
                placeholder="نام شما"
                value={values.name}
                onChange={(event) => setValue('name')(event.target.value)}
              />
              <FieldError id="name" message={errors.name} />
            </div>

            <div className="mb-[17px]">
              <label className="mb-[7px] block text-[11px] font-semibold" htmlFor="contact-email">
                آدرس ایمیل
              </label>
              <Input
                aria-describedby="contact-email-error"
                aria-invalid={errors.email ? true : undefined}
                autoComplete="email"
                className={fieldClass}
                dir="ltr"
                id="contact-email"
                inputMode="email"
                maxLength={254}
                name="email"
                placeholder="you@company.com"
                type="email"
                value={values.email}
                onChange={(event) => setValue('email')(event.target.value)}
              />
              <FieldError id="email" message={errors.email} />
            </div>

            <div className="mb-[17px]">
              <label className="mb-[7px] block text-[11px] font-semibold" htmlFor="contact-phone">
                شماره موبایل (اختیاری)
              </label>
              <Input
                aria-describedby="contact-phone-error"
                aria-invalid={errors.phone ? true : undefined}
                autoComplete="tel-national"
                className={fieldClass}
                dir="ltr"
                id="contact-phone"
                inputMode="tel"
                maxLength={20}
                name="phone"
                placeholder="0912 345 6789"
                type="tel"
                value={values.phone}
                onChange={(event) => setValue('phone')(event.target.value)}
              />
              <FieldError id="phone" message={errors.phone} />
            </div>

            <div className="mb-[17px]">
              <label className="mb-[7px] block text-[11px] font-semibold" htmlFor="contact-topic">
                موضوع پیام
              </label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className={selectClass} id="contact-topic" name="topic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-[17px]">
            <label className="mb-[7px] block text-[11px] font-semibold" htmlFor="contact-message">
              پیام شما
            </label>
            <Textarea
              aria-describedby="contact-message-error"
              aria-invalid={errors.message ? true : undefined}
              className={textareaClass}
              id="contact-message"
              maxLength={3000}
              name="message"
              placeholder="کمی از نیاز یا پرسشتان بنویسید…"
              value={values.message}
              onChange={(event) => setValue('message')(event.target.value)}
            />
            <FieldError id="message" message={errors.message} />
          </div>

          <Button
            className="min-h-12 w-full rounded-lg text-[12px] font-semibold"
            type="submit"
          >
            بررسی پیام نمونه
            <TarazIcon className="size-[19px]" name="arrow" />
          </Button>

          <p className="mt-[14px] flex items-start gap-1.5 text-[10px] leading-[2] text-contact-note">
            <TarazIcon className="mt-[3px] size-[13px]" name="info" />
            این فرم نمایشی است؛ هیچ پیام یا ایمیلی برای کسی ارسال نمی‌شود.
          </p>
        </form>
      )}
    </section>
  );
}

export default ContactForm;
