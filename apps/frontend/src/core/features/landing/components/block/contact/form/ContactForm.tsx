'use client';
import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';

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
    <div
      aria-label="فرم تماس نمایشی"
      className="rounded-xl border border-border bg-card py-6 px-5 max-xl:p-7 max-lg:p-6 sm:py-7 sm:px-8"
    >
      <H2 className="mb-1.5 text-xl leading-relaxed tracking-tight">همین‌جا برایمان بنویسید.</H2>
      <P className="mb-6 text-xs leading-loose text-muted-foreground max-sm:mb-5">
        فیلدهای نام، ایمیل و پیام برای تکمیل فرم لازم‌اند.
      </P>

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
          <Button className="min-h-12 w-full rounded-lg text-xs font-semibold" type="submit">
            <Span className="text-[length:inherit]">بررسی پیام نمونه</Span>
            <ArrowLeft className="size-5" />
          </Button>
          <P className="mt-3.5 flex items-start gap-1.5 text-xs leading-loose text-muted-foreground">
            <Info className="mt-0.5 size-3" />
            این فرم نمایشی است؛ هیچ پیام یا ایمیلی برای کسی ارسال نمی‌شود.
          </P>
        </form>
      )}
    </div>
  );
}
