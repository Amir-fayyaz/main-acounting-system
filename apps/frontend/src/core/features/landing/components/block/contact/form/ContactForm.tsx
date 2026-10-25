'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/shadcn/button/button';
import { contactTopics, emptyContactValues } from '@/core/features/landing/assets/mock/contact';
import type {
  ContactFieldErrors,
  ContactFieldId,
  ContactFieldValues,
} from '@/core/features/landing/assets/@types/contact';
import {
  contactFieldOrder,
  validateContactForm,
} from '@/core/features/landing/lib/contact-validation';
import { ContactFields } from '@/core/features/landing/components/ui/contact/ContactFields';
import { ContactSuccess } from '@/core/features/landing/components/ui/contact/ContactSuccess';

export function ContactForm() {
  const searchParams = useSearchParams();
  const nameRef = useRef<HTMLInputElement>(null);
  const focusNameAfterReset = useRef(false);
  const [values, setValues] = useState<ContactFieldValues>(emptyContactValues);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [successName, setSuccessName] = useState<string | null>(null);
  const [topic, setTopic] = useState(() => {
    const selected = searchParams.get('topic');
    return selected && contactTopics.some((item) => item.value === selected)
      ? selected
      : contactTopics[0].value;
  });

  useEffect(() => {
    if (successName !== null) {
      document.getElementById('contact-success-title')?.focus();
    } else if (focusNameAfterReset.current) {
      nameRef.current?.focus();
      focusNameAfterReset.current = false;
    }
  }, [successName]);

  const updateField = (id: ContactFieldId, value: string) => {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => ({ ...current, [id]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateContactForm(values);
    setErrors(nextErrors);

    const firstInvalid = contactFieldOrder.find((id) => nextErrors[id]);
    if (firstInvalid) {
      document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }
    setSuccessName(values.name.trim());
  };

  const handleReset = () => {
    focusNameAfterReset.current = true;
    setValues(emptyContactValues);
    setErrors({});
    setSuccessName(null);
  };

  return (
    <section
      aria-label="فرم تماس نمایشی"
      className="rounded-[14px] border border-border bg-card p-[25px_22px] max-[1100px]:p-[27px] max-[900px]:p-6 sm:p-[30px_32px]"
    >
      <h2 className="mb-[6px] text-[22px] leading-[1.8] tracking-[-0.4px] sm:text-[21px]">
        همین‌جا برایمان بنویسید.
      </h2>
      <p className="mb-[23px] text-[11px] leading-[2] text-muted-foreground max-[600px]:mb-[21px]">
        فیلدهای نام، ایمیل و پیام برای تکمیل فرم لازم‌اند.
      </p>

      {successName ? (
        <ContactSuccess name={successName} onReset={handleReset} />
      ) : (
        <form noValidate onSubmit={handleSubmit}>
          <ContactFields
            errors={errors}
            nameRef={nameRef}
            topic={topic}
            topics={contactTopics}
            values={values}
            onChange={updateField}
            onTopicChange={setTopic}
          />
          <Button className="min-h-12 w-full rounded-lg text-[12px] font-semibold" type="submit">
            بررسی پیام نمونه
            <ArrowLeft className="size-[19px]" />
          </Button>
          <p className="mt-[14px] flex items-start gap-1.5 text-[10px] leading-[2] text-muted-foreground">
            <Info className="mt-[3px] size-[13px]" />
            این فرم نمایشی است؛ هیچ پیام یا ایمیلی برای کسی ارسال نمی‌شود.
          </p>
        </form>
      )}
    </section>
  );
}
