import {
  Input,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
  Textarea,
} from '@repo/web/ui';
import type { Ref } from 'react';

import type {
  ContactFieldErrors,
  ContactFieldId,
  ContactFieldValues,
  ContactTopic,
} from '@/core/features/landing/assets/@types/contact';

interface ContactFieldsProps {
  values: ContactFieldValues;
  errors: ContactFieldErrors;
  topic: string;
  topics: ContactTopic[];
  nameRef: Ref<HTMLInputElement>;
  onChange: (_id: ContactFieldId, _value: string) => void;
  onTopicChange: (_topic: string) => void;
}

const fieldClass =
  'min-h-11 rounded-md border-border! bg-sand-soft! px-3 py-2.5 text-xs placeholder:text-muted-foreground! aria-invalid:border-destructive!';
const textareaClass =
  'mt-0! min-h-32! rounded-md border-border! bg-sand-soft! px-3 py-2.5! text-xs leading-loose placeholder:text-muted-foreground! aria-invalid:border-destructive! [field-sizing:fixed]';

function FieldError({ id, message }: { id: ContactFieldId; message?: string }) {
  return message ? (
    <P className="mt-1 text-xs leading-loose text-destructive" id={`contact-${id}-error`}>
      {message}
    </P>
  ) : null;
}

export function ContactFields({
  values,
  errors,
  topic,
  topics,
  nameRef,
  onChange,
  onTopicChange,
}: ContactFieldsProps) {
  const input = (
    id: Exclude<ContactFieldId, 'message'>,
    label: string,
    props: {
      type?: string;
      inputMode?: 'email' | 'tel';
      autoComplete: string;
      placeholder: string;
    },
  ) => (
    <div className="mb-4">
      <label className="mb-1.5 block text-xs font-semibold" htmlFor={`contact-${id}`}>
        <Span className="text-[length:inherit]">{label}</Span>
      </label>
      <Input
        {...props}
        aria-describedby={`contact-${id}-error`}
        aria-invalid={errors[id] ? true : undefined}
        className={fieldClass}
        dir={id === 'name' ? undefined : 'ltr'}
        id={`contact-${id}`}
        maxLength={id === 'name' ? 80 : id === 'email' ? 254 : 20}
        name={id}
        ref={id === 'name' ? nameRef : undefined}
        value={values[id]}
        onChange={(event) => onChange(id, event.target.value)}
      />
      <FieldError id={id} message={errors[id]} />
    </div>
  );

  return (
    <>
      <div className="grid gap-x-4 max-lg:grid-cols-1 sm:grid-cols-2">
        {input('name', 'نام و نام خانوادگی', {
          autoComplete: 'name',
          placeholder: 'نام شما',
        })}
        {input('email', 'آدرس ایمیل', {
          autoComplete: 'email',
          inputMode: 'email',
          placeholder: 'you@company.com',
          type: 'email',
        })}
        {input('phone', 'شماره موبایل (اختیاری)', {
          autoComplete: 'tel-national',
          inputMode: 'tel',
          placeholder: '0912 345 6789',
          type: 'tel',
        })}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold" htmlFor="contact-topic">
            <Span className="text-[length:inherit]">موضوع پیام</Span>
          </label>
          <Select value={topic} onValueChange={onTopicChange}>
            <SelectTrigger
              className="w-full! min-h-11 rounded-md border-border! bg-sand-soft! px-3 py-2.5 text-xs"
              id="contact-topic"
              name="topic"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topics.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <Span className="text-[length:inherit]">{item.label}</Span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold" htmlFor="contact-message">
          <Span className="text-[length:inherit]">پیام شما</Span>
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
          onChange={(event) => onChange('message', event.target.value)}
        />
        <FieldError id="message" message={errors.message} />
      </div>
    </>
  );
}
